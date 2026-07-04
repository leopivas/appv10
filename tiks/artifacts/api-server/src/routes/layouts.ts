import { Router, type Request, type Response } from "express";
import { requireAuth } from "./auth";
import { db } from "@workspace/db";
import { layoutPresetsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

const MAX_PRESETS = 20;

type AuthReq = Request & { userId: string };

// GET /api/layouts — list all presets for the authenticated user
router.get("/layouts", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthReq).userId;
  const rows = await db
    .select()
    .from(layoutPresetsTable)
    .where(eq(layoutPresetsTable.userId, userId))
    .orderBy(desc(layoutPresetsTable.createdAt));
  res.json(rows.map(r => ({
    id: r.id,
    name: r.name,
    layers: JSON.parse(r.layers) as unknown[],
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  })));
});

// POST /api/layouts — create a new preset
router.post("/layouts", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthReq).userId;
  const { name, layers } = req.body as { name?: unknown; layers?: unknown };

  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name é obrigatório" });
    return;
  }
  if (!Array.isArray(layers)) {
    res.status(400).json({ error: "layers deve ser um array" });
    return;
  }

  const existing = await db
    .select({ id: layoutPresetsTable.id })
    .from(layoutPresetsTable)
    .where(eq(layoutPresetsTable.userId, userId));

  if (existing.length >= MAX_PRESETS) {
    res.status(400).json({ error: `Limite de ${MAX_PRESETS} presets atingido` });
    return;
  }

  const now = Date.now();
  const [row] = await db.insert(layoutPresetsTable).values({
    id: crypto.randomUUID(),
    userId,
    name: name.trim().slice(0, 80),
    layers: JSON.stringify(layers),
    createdAt: now,
    updatedAt: now,
  }).returning();

  res.status(201).json({
    id: row.id,
    name: row.name,
    layers: JSON.parse(row.layers) as unknown[],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
});

// PATCH /api/layouts/:id — rename a preset
router.patch("/layouts/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthReq).userId;
  const { id } = req.params as { id: string };
  const { name } = req.body as { name?: unknown };

  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name é obrigatório" });
    return;
  }

  const [row] = await db
    .update(layoutPresetsTable)
    .set({ name: name.trim().slice(0, 80), updatedAt: Date.now() })
    .where(and(eq(layoutPresetsTable.id, id), eq(layoutPresetsTable.userId, userId)))
    .returning();

  if (!row) { res.status(404).json({ error: "Preset não encontrado" }); return; }

  res.json({
    id: row.id,
    name: row.name,
    layers: JSON.parse(row.layers) as unknown[],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
});

// DELETE /api/layouts/:id — delete a preset
router.delete("/layouts/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthReq).userId;
  const { id } = req.params as { id: string };

  const [deleted] = await db
    .delete(layoutPresetsTable)
    .where(and(eq(layoutPresetsTable.id, id), eq(layoutPresetsTable.userId, userId)))
    .returning({ id: layoutPresetsTable.id });

  if (!deleted) { res.status(404).json({ error: "Preset não encontrado" }); return; }
  res.status(204).send();
});

export default router;
