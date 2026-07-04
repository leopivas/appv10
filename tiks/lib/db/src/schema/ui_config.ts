import { pgTable, text, jsonb } from "drizzle-orm/pg-core";

export const uiConfigTable = pgTable("ui_config", {
  id:              text("id").primaryKey().default("default"),
  navType:         text("nav_type").notNull().default("sidebar"),
  primaryColor:    text("primary_color").notNull().default("180 100% 50%"),
  secondaryColor:  text("secondary_color").notNull().default("333 99% 52%"),
  logoText:        text("logo_text").notNull().default("Creatools"),
  logoUrl:         text("logo_url").notNull().default(""),
  sidebarSections: jsonb("sidebar_sections").notNull().default([]),
  headerConfig:    jsonb("header_config"),
  featuredSlides:  jsonb("featured_slides"),
  updatedAt:       text("updated_at").notNull(),
});

export type UIConfigRow = typeof uiConfigTable.$inferSelect;
export type InsertUIConfigRow = typeof uiConfigTable.$inferInsert;
