import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { assertCompanyAccess } from "./authz.js";
import { isShimbotDbConfigured, queryShimbot } from "../services/shimbot-db.js";

export function shimbotRoutes(_db: Db) {
  const router = Router();

  // Guard: all shimbot routes require shimbot DB to be configured
  router.use("/companies/:companyId/shimbot", (req, res, next) => {
    assertCompanyAccess(req, req.params.companyId as string);
    if (!isShimbotDbConfigured()) {
      res.status(503).json({ error: "ShimBot database not configured" });
      return;
    }
    next();
  });

  // PPC summary — last 7 days
  router.get("/companies/:companyId/shimbot/ppc/summary", async (_req, res) => {
    const rows = await queryShimbot(`
      SELECT
        COALESCE(SUM(spend), 0) AS total_spend,
        COALESCE(SUM(sales), 0) AS total_sales,
        COALESCE(SUM(orders), 0) AS total_orders,
        CASE WHEN SUM(sales) > 0 THEN SUM(spend) / SUM(sales) * 100 ELSE 0 END AS acos_pct,
        COUNT(DISTINCT campaign_id) AS campaigns
      FROM ppc_daily_metrics
      WHERE date >= CURRENT_DATE - INTERVAL '7 days'
    `);
    res.json(rows[0] || {});
  });

  // PPC campaigns — top 50 by spend, last 7 days
  router.get("/companies/:companyId/shimbot/ppc/campaigns", async (_req, res) => {
    const rows = await queryShimbot(`
      SELECT
        m.campaign_id,
        c.campaign_name,
        c.asin,
        COALESCE(SUM(m.spend), 0) AS spend_7d,
        COALESCE(SUM(m.sales), 0) AS sales_7d,
        COALESCE(SUM(m.orders), 0) AS orders_7d,
        CASE WHEN SUM(m.sales) > 0 THEN SUM(m.spend) / SUM(m.sales) * 100 ELSE 0 END AS acos_pct
      FROM ppc_daily_metrics m
      JOIN ppc_campaigns c ON m.campaign_id = c.campaign_id
      WHERE m.date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY m.campaign_id, c.campaign_name, c.asin
      ORDER BY SUM(m.spend) DESC
      LIMIT 50
    `);
    res.json(rows);
  });

  // Decision queue — pending + recent decisions
  router.get("/companies/:companyId/shimbot/decisions", async (req, res) => {
    const status = (req.query.status as string) || "pending";
    const where = status === "all"
      ? "WHERE decision_required = true"
      : "WHERE decision_required = true AND status = $1";
    const params = status === "all" ? [] : [status];
    const rows = await queryShimbot(
      `SELECT task_id, title, description, category, priority, status, decision,
              action_type, action_params, confidence, risk_level,
              created_at, decided_at, executed_at, created_by
       FROM agent_tasks
       ${where}
       ORDER BY
         CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
         created_at DESC
       LIMIT 100`,
      params,
    );
    res.json(rows);
  });

  // Approve / reject / defer a decision
  router.post("/companies/:companyId/shimbot/decisions/:taskId/review", async (req, res) => {
    const { taskId } = req.params;
    const { decision } = req.body as { decision: "approved" | "rejected" | "deferred" };
    if (!["approved", "rejected", "deferred"].includes(decision)) {
      res.status(400).json({ error: "decision must be approved, rejected, or deferred" });
      return;
    }
    const newStatus = decision === "approved" ? "approved" : decision === "deferred" ? "pending" : "rejected";
    await queryShimbot(
      `UPDATE agent_tasks
       SET decision = $1, decided_at = NOW(), status = $2
       WHERE task_id = $3`,
      [decision, newStatus, taskId],
    );
    res.json({ ok: true, taskId, decision });
  });

  // Inventory status
  router.get("/companies/:companyId/shimbot/inventory", async (_req, res) => {
    const rows = await queryShimbot(`
      SELECT
        p.asin, p.title, p.status,
        COALESCE(i.fba_quantity, 0) AS fba_quantity,
        COALESCE(i.daily_velocity, 0) AS daily_velocity,
        i.days_of_stock,
        i.reorder_point,
        i.updated_at
      FROM products p
      LEFT JOIN inventory_status i ON p.asin = i.asin
      WHERE p.status = 'active'
      ORDER BY COALESCE(i.days_of_stock, 999) ASC
    `);
    res.json(rows);
  });

  // Products list
  router.get("/companies/:companyId/shimbot/products", async (_req, res) => {
    const rows = await queryShimbot(`
      SELECT asin, title, sku, status, target_acos, category
      FROM products
      ORDER BY status, title
    `);
    res.json(rows);
  });

  // Agent memory for a given agent
  router.get("/companies/:companyId/shimbot/memory/:agentName", async (req, res) => {
    const { agentName } = req.params;
    const rows = await queryShimbot(
      `SELECT key, value, updated_at
       FROM agent_memory
       WHERE agent_name = $1
       ORDER BY updated_at DESC`,
      [agentName],
    );
    res.json(rows);
  });

  return router;
}
