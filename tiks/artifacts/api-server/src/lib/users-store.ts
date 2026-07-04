import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq, ne, and, sql } from "drizzle-orm";

export type StoredUser = typeof usersTable.$inferSelect;
export type InsertStoredUser = typeof usersTable.$inferInsert;

export function makeId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function getAllUsers(): Promise<StoredUser[]> {
  return db.select().from(usersTable).orderBy(usersTable.createdAt);
}

export async function getUserById(id: string): Promise<StoredUser | null> {
  const rows = await db.select().from(usersTable).where(eq(usersTable.id, id));
  return rows[0] ?? null;
}

export async function getUserByEmail(email: string): Promise<StoredUser | null> {
  const rows = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  return rows[0] ?? null;
}

export async function getUserByTiktokUsername(username: string): Promise<StoredUser | null> {
  const rows = await db.select().from(usersTable).where(
    sql`lower(${usersTable.tiktokUsername}) = ${username.toLowerCase()}`
  );
  return rows[0] ?? null;
}

export async function getUserByTiktokOAuthId(oauthId: string): Promise<StoredUser | null> {
  const rows = await db.select().from(usersTable).where(eq(usersTable.tiktokOAuthId, oauthId));
  return rows[0] ?? null;
}

export async function countUsers(): Promise<number> {
  const rows = await db.select({ count: sql<string>`count(*)` }).from(usersTable);
  return parseInt(rows[0]?.count ?? "0", 10);
}

export async function createUser(data: InsertStoredUser): Promise<StoredUser> {
  const rows = await db.insert(usersTable).values(data).returning();
  return rows[0];
}

export async function updateUser(id: string, data: Partial<InsertStoredUser>): Promise<StoredUser | null> {
  const rows = await db.update(usersTable).set(data).where(eq(usersTable.id, id)).returning();
  return rows[0] ?? null;
}

export async function deleteUserById(id: string): Promise<void> {
  await db.delete(usersTable).where(eq(usersTable.id, id));
}

export async function emailConflictExists(email: string, excludeId: string): Promise<boolean> {
  const rows = await db.select({ id: usersTable.id }).from(usersTable).where(
    and(eq(usersTable.email, email.toLowerCase()), ne(usersTable.id, excludeId))
  );
  return rows.length > 0;
}

export async function tiktokUsernameConflictExists(username: string, excludeId: string): Promise<boolean> {
  const rows = await db.select({ id: usersTable.id }).from(usersTable).where(
    and(
      sql`lower(${usersTable.tiktokUsername}) = ${username.toLowerCase()}`,
      ne(usersTable.id, excludeId)
    )
  );
  return rows.length > 0;
}

export function publicUser(u: StoredUser) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const changesThisWeek = (u.tiktokUsernameChangeLog ?? [])
    .filter((ts) => new Date(ts).getTime() > weekAgo).length;

  return {
    id: u.id,
    email: u.email,
    name: u.name,
    plan: u.plan,
    isAdmin: u.isAdmin,
    roleId: u.roleId ?? null,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt ?? null,
    hasStripe: !!u.stripeCustomerId,
    tiktokUsername: u.tiktokUsername ?? null,
    tiktokUsernameChangesThisWeek: changesThisWeek,
    tiktokVerified: u.tiktokVerified ?? false,
    tiktokProfilePicture: u.tiktokProfilePicture ?? null,
    tiktokDisplayName: u.tiktokDisplayName ?? null,
    tiktokFollowerCount: u.tiktokFollowerCount ?? null,
    tiktokLinkedAt: u.tiktokLinkedAt ?? null,
    hasTiktokOAuth: !!u.tiktokOAuthId,
  };
}
