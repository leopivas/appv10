import { Router, type Request, type Response } from "express";
import { requireAuth, requireAdminMiddleware } from "./auth";
import { db } from "@workspace/db";
import { announcementsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { asc, desc } from "drizzle-orm";

const router = Router();

type Announcement = typeof announcementsTable.$inferSelect;

function makeAnnId(): string {
  return `ann_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// GET /announcements
router.get("/announcements", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  const rows = await db.select().from(announcementsTable).orderBy(desc(announcementsTable.createdAt));
  const sorted = [...rows].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return Number(b.createdAt) - Number(a.createdAt);
  });
  res.json({ announcements: sorted });
});

// POST /announcements — admin only
router.post("/announcements", requireAdminMiddleware, async (req: Request, res: Response): Promise<void> => {
  const { title, body, type = "info", pinned = false, emoji, imageUrl } = req.body as {
    title?: string; body?: string; type?: Announcement["type"]; pinned?: boolean; emoji?: string; imageUrl?: string;
  };

  if (!title?.trim() || !body?.trim()) {
    res.status(400).json({ error: "title e body são obrigatórios" }); return;
  }

  const rows = await db.insert(announcementsTable).values({
    id: makeAnnId(),
    title: title.trim(),
    body: body.trim(),
    type: type ?? "info",
    pinned: !!pinned,
    createdAt: Date.now(),
    emoji: emoji?.trim() || undefined,
    imageUrl: imageUrl?.trim() || undefined,
  }).returning();

  res.status(201).json(rows[0]);
});

// PATCH /announcements/:id — admin only
router.patch("/announcements/:id", requireAdminMiddleware, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const { title, body, type, pinned, emoji, imageUrl } = req.body as Partial<Announcement> & { imageUrl?: string };

  const rows = await db.select().from(announcementsTable).where(eq(announcementsTable.id, id));
  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }

  const updates: Partial<Announcement> & { imageUrl?: string | null } = {};
  if (title !== undefined) updates.title = (title as string).trim();
  if (body !== undefined) updates.body = (body as string).trim();
  if (type !== undefined) updates.type = type;
  if (pinned !== undefined) updates.pinned = !!pinned;
  if (emoji !== undefined) updates.emoji = (emoji as string | undefined)?.trim() || undefined;
  if (imageUrl !== undefined) updates.imageUrl = (imageUrl as string | undefined)?.trim() || null;

  const updated = await db.update(announcementsTable).set(updates).where(eq(announcementsTable.id, id)).returning();
  res.json(updated[0]);
});

// DELETE /announcements/:id — admin only
router.delete("/announcements/:id", requireAdminMiddleware, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const rows = await db.delete(announcementsTable).where(eq(announcementsTable.id, id)).returning();
  if (!rows.length) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ok: true });
});

export default router;
