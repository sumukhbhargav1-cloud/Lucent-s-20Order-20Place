import { RequestHandler } from "express";
import { db } from "../db";
import { Order } from "@shared/api";

export const exportCSV: RequestHandler = (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: "date required (YYYY-MM-DD)" });
  }

  try {
    const start = new Date(date as string);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date as string);
    end.setHours(23, 59, 59, 999);

    const rows = db
      .prepare(
        "SELECT * FROM orders WHERE created_at BETWEEN ? AND ? ORDER BY created_at",
      )
      .all(start.toISOString(), end.toISOString()) as Order[];

    const lines = [
      "order_no,created_at,guest_name,room_no,total,status,payment_status,items",
    ];

    for (const r of rows) {
      const items = db
        .prepare("SELECT qty,name FROM order_items WHERE order_id = ?")
        .all(r.id) as any[];
      const itemsStr = items.map((x) => `${x.qty}x ${x.name}`).join("|");
      lines.push(
        `"${r.order_no}","${r.created_at}","${r.guest_name}","${r.room_no}",${r.total},"${r.status}","${r.payment_status}","${itemsStr}"`,
      );
    }

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="orders-${date}.csv"`,
    );
    res.setHeader("Content-Type", "text/csv");
    res.send(lines.join("\n"));
  } catch (err: any) {
    res
      .status(500)
      .json({ error: "Failed to export CSV", details: err.message });
  }
};
