import { db } from "@workspace/db";
import { rolesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export type Role = typeof rolesTable.$inferSelect;
export type InsertRole = typeof rolesTable.$inferInsert;

export const ALL_PERMISSIONS: Array<{ id: string; label: string; category: string }> = [
  { id: "view_dashboard",           label: "Dashboard",               category: "Páginas" },
  { id: "view_monitor",             label: "Monitor",                 category: "Páginas" },
  { id: "view_bulk_check",          label: "Bulk Check",              category: "Páginas" },
  { id: "view_gaming_leaderboard",  label: "Gaming Leaderboard",      category: "Páginas" },
  { id: "view_gifters",             label: "Gifters Leaderboard",     category: "Páginas" },
  { id: "view_webhooks",            label: "Webhooks",                category: "Páginas" },
  { id: "view_live_captions",       label: "Live Captions",           category: "Páginas" },
  { id: "view_live_analytics",      label: "Live Analytics",          category: "Páginas" },
  { id: "view_country_leaderboard", label: "Country Leaderboard",     category: "Páginas" },
  { id: "view_gift_gallery",        label: "Gift Gallery",            category: "Páginas" },
  { id: "use_watchlist",            label: "Watchlist",               category: "Funcionalidades" },
  { id: "use_jwt",                  label: "JWT / WebSocket",         category: "Funcionalidades" },
  { id: "change_tiktok_username",   label: "Alterar TikTok Username", category: "Funcionalidades" },
  { id: "view_admin_panel",         label: "Painel Admin",            category: "Admin" },
];

export function makeRoleId(): string {
  return "role_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function getAllRoles(): Promise<Role[]> {
  return db.select().from(rolesTable).orderBy(rolesTable.createdAt);
}

export async function getRoleById(id: string): Promise<Role | null> {
  const rows = await db.select().from(rolesTable).where(eq(rolesTable.id, id));
  return rows[0] ?? null;
}

export async function createRole(data: InsertRole): Promise<Role> {
  const rows = await db.insert(rolesTable).values(data).returning();
  return rows[0];
}

export async function updateRole(id: string, data: Partial<InsertRole>): Promise<Role | null> {
  const rows = await db.update(rolesTable).set(data).where(eq(rolesTable.id, id)).returning();
  return rows[0] ?? null;
}

export async function deleteRole(id: string): Promise<void> {
  await db.delete(rolesTable).where(eq(rolesTable.id, id));
}
