import { Router } from "express";

export const healthRoutes = Router();

healthRoutes.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

healthRoutes.get("/ping", (_req, res) => {
  res.json({ message: "pong" });
});
