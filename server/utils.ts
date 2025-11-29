import { getDb } from "./db";
import { Order, OrderItem, HistoryEntry } from "@shared/api";

async function getDatabase() {
  return getDb();
}

export function makeOrderNo(): string {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  const ts = Date.now().toString().slice(-5);
  return `ORD-${y}${m}${day}-${ts}`;
}

export function getOrderById(id: string): Order | null {
  const o = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as any;
  if (!o) return null;

  const items = db
    .prepare("SELECT * FROM order_items WHERE order_id = ?")
    .all(id) as OrderItem[];

  const history = o.history ? JSON.parse(o.history) : [];

  return {
    ...o,
    items,
    history,
  };
}

export function getOrdersWithFilters(
  date?: string,
  status?: string,
  room_no?: string,
  search?: string,
): Order[] {
  let sql = "SELECT * FROM orders";
  const cond = [];
  const params: any[] = [];

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    cond.push("created_at BETWEEN ? AND ?");
    params.push(start.toISOString(), end.toISOString());
  }

  if (status) {
    cond.push("status = ?");
    params.push(status);
  }

  if (room_no) {
    cond.push("room_no = ?");
    params.push(room_no);
  }

  if (search) {
    cond.push("(guest_name LIKE ? OR room_no LIKE ? OR order_no LIKE ?)");
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  if (cond.length) sql += " WHERE " + cond.join(" AND ");
  sql += " ORDER BY created_at DESC";

  const rows = db.prepare(sql).all(...params) as any[];

  return rows.map((r) => ({
    ...r,
    items: db
      .prepare("SELECT * FROM order_items WHERE order_id = ?")
      .all(r.id) as OrderItem[],
    history: r.history ? JSON.parse(r.history) : [],
  }));
}

export function calculateOrderTotal(items: any[]): number {
  return items.reduce((sum, item) => sum + item.qty * item.price, 0);
}

export function addHistoryEntry(
  history: HistoryEntry[],
  action: string,
): HistoryEntry[] {
  history.push({
    when: new Date().toISOString(),
    action,
  });
  return history;
}
