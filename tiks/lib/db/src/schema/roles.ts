import { pgTable, text } from "drizzle-orm/pg-core";

export const rolesTable = pgTable("roles", {
  id:          text("id").primaryKey(),
  name:        text("name").notNull(),
  description: text("description").notNull().default(""),
  color:       text("color").notNull().default("gray"),
  permissions: text("permissions").array().default([]),
  createdAt:   text("created_at").notNull(),
  updatedAt:   text("updated_at").notNull(),
});

export type RoleRow = typeof rolesTable.$inferSelect;
export type InsertRoleRow = typeof rolesTable.$inferInsert;
