import { Router, type IRouter, type Request } from "express";
import { requireAuth } from "./auth";
import {
  getTicketsByUser, getAllTickets, getTicketById, getPendingTicketByUser,
  createTicket, updateTicket, getMessagesByTicket, addMessage,
} from "../lib/support-store";
import { getUserById, updateUser, getAllUsers, publicUser } from "../lib/users-store";

const router: IRouter = Router();
type AuthReq = Request & { userId: string };

// GET /support/tickets — user's own tickets
router.get("/support/tickets", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthReq).userId;
  const tickets = (await getTicketsByUser(userId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const messages = await Promise.all(tickets.map((t) => getMessagesByTicket(t.id)));
  res.json({ tickets, messages: messages.flat() });
});

// POST /support/tickets — create ticket (tiktok_username_change or general)
router.post("/support/tickets", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthReq).userId;
  const body = req.body as {
    type?: string;
    newTiktokUsername?: string; reason?: string; customReason?: string;
    subject?: string; message?: string;
  };

  const user = await getUserById(userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  // ── General support ticket ────────────────────────────────────────────────
  if (body.type === "general") {
    const subject = body.subject?.trim();
    const message = body.message?.trim();
    if (!subject) { res.status(400).json({ error: "subject é obrigatório" }); return; }

    const ticket = await createTicket({
      type: "general",
      userId,
      userEmail: user.email,
      userName: user.name,
      newValue: subject,
      reason: "general",
      customReason: message ?? undefined,
    });

    if (message) {
      await addMessage({ ticketId: ticket.id, fromAdmin: false, authorName: user.name, text: message });
    }

    req.log.info({ userId, ticketId: ticket.id, type: "general" }, "General support ticket created");
    res.status(201).json({ ticket });
    return;
  }

  // ── TikTok username change ────────────────────────────────────────────────
  const { newTiktokUsername, reason, customReason } = body;
  if (!newTiktokUsername || !reason) {
    res.status(400).json({ error: "newTiktokUsername and reason are required" }); return;
  }

  const pending = await getPendingTicketByUser(userId, "tiktok_username_change");
  if (pending) { res.status(409).json({ error: "Você já possui uma solicitação pendente.", ticketId: pending.id }); return; }

  const ticket = await createTicket({
    type: "tiktok_username_change",
    userId,
    userEmail: user.email,
    userName: user.name,
    oldValue: user.tiktokUsername ?? undefined,
    newValue: newTiktokUsername.trim().replace(/^@/, ""),
    reason,
    customReason: customReason ?? undefined,
  });

  req.log.info({ userId, ticketId: ticket.id }, "Support ticket created");
  res.status(201).json({ ticket });
});

// PATCH /support/tickets/:id/cancel
router.patch("/support/tickets/:id/cancel", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthReq).userId;
  const { id } = req.params as { id: string };
  const ticket = await getTicketById(id);
  if (!ticket || ticket.userId !== userId) { res.status(404).json({ error: "Ticket not found" }); return; }
  if (ticket.status !== "pending") { res.status(400).json({ error: "Só é possível cancelar tickets pendentes" }); return; }
  const updated = await updateTicket(id, { status: "cancelled", resolvedAt: new Date().toISOString() });
  res.json({ ticket: updated });
});

// GET /support/tickets/:id/messages
router.get("/support/tickets/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthReq).userId;
  const { id } = req.params as { id: string };
  const ticket = await getTicketById(id);
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

  const reqUser = await getUserById(userId);
  if (!reqUser?.isAdmin && ticket.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const messages = await getMessagesByTicket(id);
  res.json({ messages });
});

// POST /support/tickets/:id/messages
router.post("/support/tickets/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthReq).userId;
  const { id } = req.params as { id: string };
  const { text } = req.body as { text?: string };
  if (!text?.trim()) { res.status(400).json({ error: "text is required" }); return; }

  const ticket = await getTicketById(id);
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

  const reqUser = await getUserById(userId);
  if (!reqUser?.isAdmin && ticket.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const msg = await addMessage({ ticketId: id, fromAdmin: !!reqUser?.isAdmin, authorName: reqUser?.name ?? "?", text: text.trim() });
  res.json({ message: msg });
});

// GET /admin/support/tickets
router.get("/admin/support/tickets", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthReq).userId;
  const reqUser = await getUserById(userId);
  if (!reqUser?.isAdmin) { res.status(403).json({ error: "Admin required" }); return; }
  const tickets = (await getAllTickets()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ tickets });
});

// PATCH /admin/support/tickets/:id — approve or deny
router.patch("/admin/support/tickets/:id", requireAuth, async (req, res): Promise<void> => {
  const adminId = (req as AuthReq).userId;
  const { id } = req.params as { id: string };
  const { action, adminNote } = req.body as { action: "approve" | "deny"; adminNote?: string };

  const adminUser = await getUserById(adminId);
  if (!adminUser?.isAdmin) { res.status(403).json({ error: "Admin required" }); return; }

  const ticket = await getTicketById(id);
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  if (ticket.status !== "pending") { res.status(400).json({ error: "Ticket already resolved" }); return; }

  if (action === "approve") {
    const targetUser = await getUserById(ticket.userId);
    if (targetUser) {
      const log = [...(targetUser.tiktokUsernameChangeLog ?? []), new Date().toISOString()];
      await updateUser(ticket.userId, { tiktokUsername: ticket.newValue || undefined, tiktokUsernameChangeLog: log });
    }
  }

  const updated = await updateTicket(id, {
    status: action === "approve" ? "approved" : "denied",
    adminNote: adminNote?.trim() || undefined,
    resolvedAt: new Date().toISOString(),
    resolvedBy: adminId,
  });

  if (adminNote?.trim()) {
    await addMessage({ ticketId: id, fromAdmin: true, authorName: adminUser.name, text: adminNote.trim() });
  }

  req.log.info({ adminId, ticketId: id, action }, "Support ticket resolved");
  res.json({ ticket: updated });
});

// In-memory heartbeat map: userId → last heartbeat timestamp
const supportHeartbeats = new Map<string, number>();
const HEARTBEAT_TTL = 2 * 60 * 1000; // 2 minutes

// POST /support/heartbeat — called every 30s from the atendimento page
router.post("/support/heartbeat", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthReq).userId;
  supportHeartbeats.set(userId, Date.now());
  res.json({ ok: true });
});

// GET /support/online — true if any support agent heartbeated in the last 2 min
router.get("/support/online", async (_req, res): Promise<void> => {
  const now = Date.now();
  let isOnline = false;
  for (const [, ts] of supportHeartbeats) {
    if (now - ts < HEARTBEAT_TTL) { isOnline = true; break; }
  }
  res.json({ online: isOnline });
});

export default router;
