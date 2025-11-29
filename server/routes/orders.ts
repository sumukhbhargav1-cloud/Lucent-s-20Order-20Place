import { RequestHandler } from "express";
import { db } from "../db";
import {
  Order,
  CreateOrderRequest,
  AddItemsToOrderRequest,
  UpdateOrderRequest,
} from "@shared/api";
import { v4 as uuidv4 } from "uuid";
import {
  makeOrderNo,
  getOrderById,
  getOrdersWithFilters,
  calculateOrderTotal,
  addHistoryEntry,
} from "../utils";

export const createOrder: RequestHandler<any, Order, CreateOrderRequest> = (
  req,
  res,
) => {
  const { guest_name, room_no, notes, items, menu_version } = req.body;

  try {
    const id = uuidv4();
    const order_no = makeOrderNo();
    const now = new Date().toISOString();
    const total = calculateOrderTotal(items);

    const history = [{ when: now, action: "Created" }];

    db.prepare(
      `INSERT INTO orders (id, order_no, created_at, updated_at, guest_name, room_no, notes, source, menu_version, status, payment_status, history, total) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      order_no,
      now,
      now,
      guest_name || "",
      room_no || "",
      notes || "",
      "staff-app",
      menu_version || "RestoVersion",
      "New",
      "Not Paid",
      JSON.stringify(history),
      total,
    );

    const insertItem = db.prepare(
      `INSERT INTO order_items (id, order_id, item_key, name, qty, price) 
       VALUES (?, ?, ?, ?, ?, ?)`,
    );

    const saveItems = db.transaction((itemsToSave: any[]) => {
      for (const it of itemsToSave) {
        insertItem.run(
          uuidv4(),
          id,
          it.item_key || "",
          it.name,
          it.qty,
          it.price,
        );
      }
    });

    saveItems(items || []);

    const order = getOrderById(id);
    res.json(order);
  } catch (err: any) {
    res
      .status(500)
      .json({ error: "Failed to create order", details: err.message });
  }
};

export const getOrder: RequestHandler<{ id: string }> = (req, res) => {
  const order = getOrderById(req.params.id);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }
  res.json(order);
};

export const listOrders: RequestHandler = (req, res) => {
  const { date, status, room_no, search } = req.query;

  try {
    const orders = getOrdersWithFilters(
      date as string | undefined,
      status as string | undefined,
      room_no as string | undefined,
      search as string | undefined,
    );

    res.json(orders);
  } catch (err: any) {
    res
      .status(500)
      .json({ error: "Failed to list orders", details: err.message });
  }
};

export const addItemsToOrder: RequestHandler<
  { id: string },
  Order,
  AddItemsToOrderRequest
> = (req, res) => {
  const id = req.params.id;
  const items = req.body.items || [];

  try {
    const order = getOrderById(id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const insertItem = db.prepare(
      `INSERT INTO order_items (id, order_id, item_key, name, qty, price) 
       VALUES (?, ?, ?, ?, ?, ?)`,
    );

    const saveItems = db.transaction((itemsToSave: any[]) => {
      for (const it of itemsToSave) {
        insertItem.run(
          uuidv4(),
          id,
          it.item_key || "",
          it.name,
          it.qty,
          it.price,
        );
      }
    });

    saveItems(items);

    const addedTotal = calculateOrderTotal(items);
    const newTotal = order.total + addedTotal;
    const now = new Date().toISOString();
    let history = order.history;
    history = addHistoryEntry(history, `Added ${items.length} items`);

    db.prepare(
      "UPDATE orders SET total = ?, updated_at = ?, history = ?, status = ? WHERE id = ?",
    ).run(newTotal, now, JSON.stringify(history), "Updated", id);

    const updatedOrder = getOrderById(id);
    res.json(updatedOrder);
  } catch (err: any) {
    res
      .status(500)
      .json({ error: "Failed to add items", details: err.message });
  }
};

export const updateOrder: RequestHandler<
  { id: string },
  Order,
  UpdateOrderRequest
> = (req, res) => {
  const id = req.params.id;
  const { status, payment_status, requested_time, notes } = req.body;

  try {
    const order = getOrderById(id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const now = new Date().toISOString();
    let history = order.history;

    if (status && status !== order.status) {
      history = addHistoryEntry(history, `Status -> ${status}`);
    }
    if (payment_status && payment_status !== order.payment_status) {
      history = addHistoryEntry(history, `Payment -> ${payment_status}`);
    }

    db.prepare(
      `UPDATE orders SET status = COALESCE(?, status), payment_status = COALESCE(?, payment_status), 
       requested_time = COALESCE(?, requested_time), notes = COALESCE(?, notes), 
       updated_at = ?, history = ? WHERE id = ?`,
    ).run(
      status || null,
      payment_status || null,
      requested_time || null,
      notes || null,
      now,
      JSON.stringify(history),
      id,
    );

    const updatedOrder = getOrderById(id);
    res.json(updatedOrder);
  } catch (err: any) {
    res
      .status(500)
      .json({ error: "Failed to update order", details: err.message });
  }
};
