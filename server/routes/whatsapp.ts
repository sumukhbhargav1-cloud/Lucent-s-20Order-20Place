import { RequestHandler } from "express";
import { db } from "../db";
import { getOrderById } from "../utils";
import { addHistoryEntry } from "../utils";

export const sendWhatsAppToKitchen: RequestHandler<{ id: string }> = async (
  req,
  res
) => {
  const id = req.params.id;
  const order = getOrderById(id);

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const TWILIO_FROM = process.env.TWILIO_WHATSAPP_FROM;
  const KITCHEN_TO = process.env.KITCHEN_WHATSAPP_TO;

  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM || !KITCHEN_TO) {
    return res.status(500).json({ error: "WhatsApp not configured" });
  }

  try {
    const twilio = await import("twilio");
    const client = twilio.default(TWILIO_SID, TWILIO_TOKEN);

    const itemsText = order.items
      .map((i) => `${i.qty} x ${i.name}`)
      .join("\n");
    const msg = `NEW ORDER: ${order.order_no}\nRoom: ${order.room_no}\nGuest: ${order.guest_name}\nItems:\n${itemsText}\nTotal: ₹${order.total}\nNotes: ${order.notes || "-"}`;

    await client.messages.create({
      from: TWILIO_FROM,
      to: KITCHEN_TO,
      body: msg,
    });

    let history = order.history;
    history = addHistoryEntry(history, "WhatsApp sent to kitchen");
    db.prepare("UPDATE orders SET history = ? WHERE id = ?").run(
      JSON.stringify(history),
      id
    );

    res.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Failed to send WhatsApp", details: err.message });
  }
};

export const printBill: RequestHandler<{ id: string }> = (req, res) => {
  const id = req.params.id;
  const order = getOrderById(id);

  if (!order) {
    return res.status(404).send("Order not found");
  }

  const itemsHtml = order.items
    .map(
      (i) =>
        `<tr><td>${i.name}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">₹${i.price}</td><td style="text-align:right">₹${i.qty * i.price}</td></tr>`
    )
    .join("");

  const html = `
  <html>
  <head>
    <title>Bill ${order.order_no}</title>
    <style>
      body{ font-family: Arial, sans-serif; width:300px; margin:0; padding:8px; }
      h2{ text-align:center; margin:6px 0; }
      table{ width:100%; font-size:12px; border-collapse: collapse; }
      td,th{ padding:3px; }
      .right{ text-align:right; }
      .center{ text-align:center; }
      .footer{ font-size:11px; margin-top:8px; text-align:center; }
    </style>
  </head>
  <body>
    <h2>Lucent's Resto</h2>
    <div>Order: ${order.order_no}</div>
    <div>Date: ${new Date(order.created_at).toLocaleString()}</div>
    <div>Guest: ${order.guest_name || "-"} | Room: ${order.room_no || "-"}</div>
    <table>
      <thead><tr><th>Item</th><th class="center">Qty</th><th class="right">Rate</th><th class="right">Amt</th></tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <hr/>
    <div style="display:flex; justify-content:space-between;"><div>Subtotal</div><div>₹${order.total}</div></div>
    <div style="display:flex; justify-content:space-between;"><div>Tax</div><div>₹0</div></div>
    <div style="display:flex; justify-content:space-between; font-weight:bold;"><div>Total</div><div>₹${order.total}</div></div>
    <div class="footer">Payment status: ${order.payment_status || "Not Paid"}</div>
    <div class="footer">Thank you. Please settle at checkout.</div>
    <script>window.print();</script>
  </body>
  </html>`;

  res.send(html);
};
