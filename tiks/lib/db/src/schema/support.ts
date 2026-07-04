import { pgTable, text, boolean } from "drizzle-orm/pg-core";

export const supportTicketsTable = pgTable("support_tickets", {
  id:           text("id").primaryKey(),
  type:         text("type").notNull(),
  userId:       text("user_id").notNull(),
  userEmail:    text("user_email").notNull(),
  userName:     text("user_name").notNull(),
  oldValue:     text("old_value"),
  newValue:     text("new_value").notNull(),
  reason:       text("reason").notNull(),
  customReason: text("custom_reason"),
  status:       text("status").notNull().default("pending"),
  adminNote:    text("admin_note"),
  createdAt:    text("created_at").notNull(),
  resolvedAt:   text("resolved_at"),
  resolvedBy:   text("resolved_by"),
});

export const supportMessagesTable = pgTable("support_messages", {
  id:         text("id").primaryKey(),
  ticketId:   text("ticket_id").notNull().references(() => supportTicketsTable.id),
  fromAdmin:  boolean("from_admin").notNull().default(false),
  authorName: text("author_name").notNull(),
  text:       text("text").notNull(),
  createdAt:  text("created_at").notNull(),
});

export type SupportTicketRow = typeof supportTicketsTable.$inferSelect;
export type SupportMessageRow = typeof supportMessagesTable.$inferSelect;
export type InsertSupportTicketRow = typeof supportTicketsTable.$inferInsert;
export type InsertSupportMessageRow = typeof supportMessagesTable.$inferInsert;
