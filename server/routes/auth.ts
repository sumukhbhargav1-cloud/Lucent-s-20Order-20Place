import { RequestHandler } from "express";
import { LoginRequest, LoginResponse } from "@shared/api";

const ADMIN_PASSPHRASE = process.env.ADMIN_PASSPHRASE || "letmein";

export const handleLogin: RequestHandler<any, LoginResponse, LoginRequest> = (
  req,
  res,
) => {
  const { passphrase } = req.body;
  if (passphrase === ADMIN_PASSPHRASE) {
    return res.json({ ok: true });
  }
  return res.status(401).json({ ok: false });
};

export function requireAuth(req: any, res: any, next: any) {
  const pass = req.headers["x-passphrase"] || req.query.pass;
  if (pass && pass === ADMIN_PASSPHRASE) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized" });
}
