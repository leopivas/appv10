import { pgTable, text, integer, boolean } from "drizzle-orm/pg-core";

export const plansTable = pgTable("plans", {
  id:                           text("id").primaryKey(),
  name:                         text("name").notNull(),
  description:                  text("description").notNull().default(""),
  price:                        integer("price").notNull().default(0),
  currency:                     text("currency").notNull().default("BRL"),
  billingPeriod:                text("billing_period").notNull().default("monthly"),
  permissions:                  text("permissions").array().default([]),
  tiktokUsernameChangesPerWeek: integer("tiktok_username_changes_per_week").notNull().default(1),
  maxConcurrentWs:              integer("max_concurrent_ws").notNull().default(1),
  maxApiCallsPerWindow:         integer("max_api_calls_per_window").notNull().default(50),
  maxLiveHoursPerMonth:         integer("max_live_hours_per_month").notNull().default(10),
  maxLiveAnalyses:              integer("max_live_analyses").notNull().default(50),
  maxWebhooks:                  integer("max_webhooks").notNull().default(0),
  features:                     text("features").array().default([]),
  color:                        text("color").notNull().default("gray"),
  order:                        integer("order").notNull().default(0),
  isActive:                     boolean("is_active").notNull().default(false),
});

export type PlanRow = typeof plansTable.$inferSelect;
export type InsertPlanRow = typeof plansTable.$inferInsert;
