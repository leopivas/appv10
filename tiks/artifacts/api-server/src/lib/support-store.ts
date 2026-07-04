import { db } from "@workspace/db";
import { supportTicketsTable, supportMessagesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

export type SupportTicket = typeof supportTicketsTable.$inferSelect;
export type SupportMessage = typeof supportMessagesTable.$inferSelect;
export type InsertSupportTicket = typeof supportTicketsTable.$inferInsert;
export type InsertSupportMessage = typeof supportMessagesTable.$inferInsert;

export type TicketStatus = "pending" | "approved" | "denied" | "cancelled";
export type TicketType = "tiktok_username_change";

function makeId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function getTicketsByUser(userId: string): Promise<SupportTicket[]> {
  return db.select().from(supportTicketsTable)
    .where(eq(supportTicketsTable.userId, userId))
    .orderBy(supportTicketsTable.createdAt);
}

export async function getAllTickets(): Promise<SupportTicket[]> {
  return db.select().from(supportTicketsTable).orderBy(supportTicketsTable.createdAt);
}

export async function getTicketById(id: string): Promise<SupportTicket | null> {
  const rows = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.id, id));
  return rows[0] ?? null;
}

export async function getPendingTicketByUser(userId: string, type: string): Promise<SupportTicket | null> {
  const rows = await db.select().from(supportTicketsTable).where(
    and(
      eq(supportTicketsTable.userId, userId),
      eq(supportTicketsTable.status, "pending"),
      eq(supportTicketsTable.type, type)
    )
  );
  return rows[0] ?? null;
}

export async function createTicket(data: Omit<InsertSupportTicket, "id" | "createdAt" | "status">): Promise<SupportTicket> {
  const rows = await db.insert(supportTicketsTable).values({
    ...data,
    id: makeId(),
    status: "pending",
    createdAt: new Date().toISOString(),
  }).returning();
  return rows[0];
}

export async function updateTicket(id: string, data: Partial<InsertSupportTicket>): Promise<SupportTicket | null> {
  const rows = await db.update(supportTicketsTable).set(data).where(eq(supportTicketsTable.id, id)).returning();
  return rows[0] ?? null;
}

export async function getMessagesByTicket(ticketId: string): Promise<SupportMessage[]> {
  return db.select().from(supportMessagesTable)
    .where(eq(supportMessagesTable.ticketId, ticketId))
    .orderBy(supportMessagesTable.createdAt);
}

export async function addMessage(data: Omit<InsertSupportMessage, "id" | "createdAt">): Promise<SupportMessage> {
  const rows = await db.insert(supportMessagesTable).values({
    ...data,
    id: makeId(),
    createdAt: new Date().toISOString(),
  }).returning();
  return rows[0];
}
