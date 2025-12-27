import "dotenv/config";
import express from "express";
import cors from "cors";
import { initializeDatabase } from "./db";
import { getMenu, uploadMenu } from "./routes/menu";
import {
  createOrder,
  getOrder,
  listOrders,
  addItemsToOrder,
  updateOrder,
} from "./routes/orders";
import { sendWhatsAppToKitchen, printBill } from "./routes/whatsapp";
import { exportCSV } from "./routes/export";

let initialized = false;

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize database on first request
  app.use(async (req, res, next) => {
    if (!initialized) {
      try {
        await initializeDatabase();
        initialized = true;
      } catch (err) {
        console.error("Failed to initialize database:", err);
      }
    }
    next();
  });

  // ========== Authentication ==========
  app.post("/api/login", handleLogin);

  // ========== Menu ==========
  app.get("/api/menu/:version", requireAuth, getMenu);
  app.post("/api/menu/:version", requireAuth, uploadMenu);

  // ========== Orders ==========
  app.post("/api/orders", requireAuth, createOrder);
  app.get("/api/orders", requireAuth, listOrders);
  app.get("/api/orders/:id", requireAuth, getOrder);
  app.post("/api/orders/:id/items", requireAuth, addItemsToOrder);
  app.put("/api/orders/:id", requireAuth, updateOrder);

  // ========== WhatsApp & Print ==========
  app.post("/api/orders/:id/send-whatsapp", requireAuth, sendWhatsAppToKitchen);
  app.get("/api/orders/:id/print", requireAuth, printBill);

  // ========== Export ==========
  app.get("/api/export/csv", requireAuth, exportCSV);

  // ========== Health Check ==========
  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  return app;
}
