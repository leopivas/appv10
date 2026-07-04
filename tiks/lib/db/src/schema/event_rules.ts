import { pgTable, text, boolean, integer, jsonb } from "drizzle-orm/pg-core";

export const eventRulesTable = pgTable("event_rules", {
  id:              text("id").primaryKey(),
  userId:          text("user_id").notNull(),
  name:            text("name").notNull(),
  enabled:         boolean("enabled").notNull().default(true),
  triggerType:     text("trigger_type").notNull(),
  triggerFilters:  jsonb("trigger_filters").notNull().default({}),
  actions:         jsonb("actions").notNull().default([]),
  cooldownSeconds: integer("cooldown_seconds").notNull().default(0),
  createdAt:       text("created_at").notNull(),
  updatedAt:       text("updated_at").notNull(),
});

export type EventRuleRow = typeof eventRulesTable.$inferSelect;
export type InsertEventRuleRow = typeof eventRulesTable.$inferInsert;
