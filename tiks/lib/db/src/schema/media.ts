import { pgTable, text, integer, bigint } from "drizzle-orm/pg-core";

export const mediaItemsTable = pgTable("media_items", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  originalName: text("original_name").notNull(),
  filename: text("filename").notNull(),
  objectPath: text("object_path").notNull(),
  category: text("category").notNull().default("Geral"),
  size: integer("size").notNull(),
  mimeType: text("mime_type").notNull(),
  width: integer("width"),
  height: integer("height"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});
