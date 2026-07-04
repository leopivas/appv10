import { Router, type Request, type Response } from "express";
import { requireAuth } from "./auth";
import { db } from "@workspace/db";
import { eventRulesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

function makeRuleId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getUserId(req: Request): string {
  return (req as Request & { userId: string }).userId;
}

// GET /events/rules — list rules for current user
router.get("/events/rules", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const rows = await db
    .select()
    .from(eventRulesTable)
    .where(eq(eventRulesTable.userId, userId))
    .orderBy(eventRulesTable.createdAt);
  res.json({ rules: rows });
});

// POST /events/rules — create rule
router.post("/events/rules", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const { name, triggerType, triggerFilters, actions, cooldownSeconds, enabled } = req.body as {
    name?: string;
    triggerType?: string;
    triggerFilters?: Record<string, unknown>;
    actions?: unknown[];
    cooldownSeconds?: number;
    enabled?: boolean;
  };

  if (!name?.trim()) { res.status(400).json({ error: "name é obrigatório" }); return; }
  if (!triggerType?.trim()) { res.status(400).json({ error: "triggerType é obrigatório" }); return; }

  const now = new Date().toISOString();
  const rows = await db.insert(eventRulesTable).values({
    id: makeRuleId(),
    userId,
    name: name.trim(),
    enabled: enabled !== false,
    triggerType: triggerType.trim(),
    triggerFilters: triggerFilters ?? {},
    actions: actions ?? [],
    cooldownSeconds: cooldownSeconds ?? 0,
    createdAt: now,
    updatedAt: now,
  }).returning();

  res.status(201).json(rows[0]);
});

// PUT /events/rules/:id — full update
router.put("/events/rules/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const { id } = req.params as { id: string };

  const existing = await db
    .select()
    .from(eventRulesTable)
    .where(and(eq(eventRulesTable.id, id), eq(eventRulesTable.userId, userId)));
  if (!existing[0]) { res.status(404).json({ error: "Not found" }); return; }

  const { name, triggerType, triggerFilters, actions, cooldownSeconds, enabled } = req.body as {
    name?: string;
    triggerType?: string;
    triggerFilters?: Record<string, unknown>;
    actions?: unknown[];
    cooldownSeconds?: number;
    enabled?: boolean;
  };

  const updated = await db.update(eventRulesTable).set({
    ...(name !== undefined ? { name: name.trim() } : {}),
    ...(triggerType !== undefined ? { triggerType } : {}),
    ...(triggerFilters !== undefined ? { triggerFilters } : {}),
    ...(actions !== undefined ? { actions } : {}),
    ...(cooldownSeconds !== undefined ? { cooldownSeconds } : {}),
    ...(enabled !== undefined ? { enabled } : {}),
    updatedAt: new Date().toISOString(),
  }).where(and(eq(eventRulesTable.id, id), eq(eventRulesTable.userId, userId))).returning();

  res.json(updated[0]);
});

// PATCH /events/rules/:id/toggle — quick enable/disable
router.patch("/events/rules/:id/toggle", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const { id } = req.params as { id: string };

  const existing = await db
    .select()
    .from(eventRulesTable)
    .where(and(eq(eventRulesTable.id, id), eq(eventRulesTable.userId, userId)));
  if (!existing[0]) { res.status(404).json({ error: "Not found" }); return; }

  const updated = await db.update(eventRulesTable).set({
    enabled: !existing[0].enabled,
    updatedAt: new Date().toISOString(),
  }).where(and(eq(eventRulesTable.id, id), eq(eventRulesTable.userId, userId))).returning();

  res.json(updated[0]);
});

// DELETE /events/rules/:id
router.delete("/events/rules/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const { id } = req.params as { id: string };

  const rows = await db
    .delete(eventRulesTable)
    .where(and(eq(eventRulesTable.id, id), eq(eventRulesTable.userId, userId)))
    .returning();
  if (!rows.length) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ok: true });
});

// DELETE /events/rules — delete all for current user
router.delete("/events/rules", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  await db.delete(eventRulesTable).where(eq(eventRulesTable.userId, userId));
  res.json({ ok: true });
});

// POST /events/rules/import — bulk import (replace all)
router.post("/events/rules/import", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const { rules } = req.body as { rules?: unknown[] };
  if (!Array.isArray(rules)) { res.status(400).json({ error: "rules deve ser um array" }); return; }

  await db.delete(eventRulesTable).where(eq(eventRulesTable.userId, userId));

  if (rules.length === 0) { res.json({ imported: 0 }); return; }

  const now = new Date().toISOString();
  const toInsert = (rules as Array<Record<string, unknown>>).map((r) => ({
    id: makeRuleId(),
    userId,
    name: String(r.name ?? "Regra importada"),
    enabled: r.enabled !== false,
    triggerType: String(r.triggerType ?? "any_gift"),
    triggerFilters: (r.triggerFilters as Record<string, unknown>) ?? {},
    actions: (r.actions as unknown[]) ?? [],
    cooldownSeconds: Number(r.cooldownSeconds ?? 0),
    createdAt: now,
    updatedAt: now,
  }));

  await db.insert(eventRulesTable).values(toInsert);
  res.json({ imported: toInsert.length });
});

export default router;
