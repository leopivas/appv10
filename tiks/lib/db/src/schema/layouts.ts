import { pgTable, text, bigint } from "drizzle-orm/pg-core";

export const layoutPresetsTable = pgTable("layout_presets", {
  id:        text("id").primaryKey(),
  userId:    text("user_id").notNull(),
  name:      text("name").notNull(),
  layers:    text("layers").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export type LayoutPresetRow = typeof layoutPresetsTable.$inferSelect;
export type InsertLayoutPresetRow = typeof layoutPresetsTable.$inferInsert;
