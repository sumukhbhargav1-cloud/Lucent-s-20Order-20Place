import { Request, Response } from "express";
import { handleLogin, requireAuth } from "../../server/routes/auth";
import { getMenu, uploadMenu } from "../../server/routes/menu";
import {
  createOrder,
  getOrder,
  listOrders,
  addItemsToOrder,
  updateOrder,
} from "../../server/routes/orders";
import { sendWhatsAppToKitchen, printBill } from "../../server/routes/whatsapp";
import { exportCSV } from "../../server/routes/export";
import { initializeDatabase } from "../../server/db";

let initialized = false;

type NetlifyHandler = (event: any, context: any) => Promise<any>;

export const api: NetlifyHandler = async (event: any, context: any) => {
  // Initialize database once
  if (!initialized) {
    try {
      await initializeDatabase();
      initialized = true;
    } catch (err) {
      console.error("Failed to initialize database:", err);
    }
  }

  const path = event.path || "";
  const method = event.httpMethod || "GET";
  const body = event.body ? JSON.parse(event.body) : {};
  const headers = event.headers || {};

  // Simple router for API endpoints
  try {
    // Login endpoint - no auth required
    if (path === "/api/login" && method === "POST") {
      const { passphrase } = body;
      const ADMIN_PASSPHRASE = process.env.ADMIN_PASSPHRASE || "letmein";
      
      if (passphrase === ADMIN_PASSPHRASE) {
        return {
          statusCode: 200,
          body: JSON.stringify({ ok: true }),
          headers: { "Content-Type": "application/json" },
        };
      }
      return {
        statusCode: 401,
        body: JSON.stringify({ ok: false }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // Health check
    if (path === "/api/health" && method === "GET") {
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // All other routes require auth
    const pass = headers["x-passphrase"] || event.queryStringParameters?.pass;
    const ADMIN_PASSPHRASE = process.env.ADMIN_PASSPHRASE || "letmein";
    
    if (!pass || pass !== ADMIN_PASSPHRASE) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized" }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // Route: POST /api/orders
    if (path === "/api/orders" && method === "POST") {
      // For now, return a simple response
      // In production, you'd call the actual handler
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // Default: not found
    return {
      statusCode: 404,
      body: JSON.stringify({ error: "Not found" }),
      headers: { "Content-Type": "application/json" },
    };
  } catch (error) {
    console.error("API Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
      headers: { "Content-Type": "application/json" },
    };
  }
};
