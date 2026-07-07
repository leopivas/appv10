import { db } from "@workspace/db";
import { plansTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export type Plan = typeof plansTable.$inferSelect;
export type InsertPlan = typeof plansTable.$inferInsert;

export { ALL_PERMISSIONS } from "./roles-store";

const DEFAULT_PLANS: InsertPlan[] = [
  {
    id: "free",
    name: "Gratuito",
    description: "Gratuito para testes e exploração",
    price: 0,
    currency: "BRL",
    billingPeriod: "free",
    permissions: ["view_dashboard","view_monitor","view_gift_gallery"],
    tiktokUsernameChangesPerWeek: 0,
    maxConcurrentWs: 1,
    maxApiCallsPerWindow: 20,
    maxLiveHoursPerMonth: 5,
    maxLiveHoursPerDay: 2,
    maxLiveAnalyses: 10,
    maxWebhooks: 0,
    maxActiveOverlays: 1,
    maxActiveScoreboards: 1,
    maxActiveMinigames: 1,
    maxAiChatMessagesPerDay: 0,
    maxAiVideoGenerationsPerMonth: 0,
    features: ["Dashboard","Monitor (básico)","Gift Gallery","5h de live/mês"],
    color: "gray",
    order: 0,
    isActive: true,
  },
  {
    id: "basic",
    name: "Basic",
    description: "Para criadores que precisam de mais ferramentas",
    price: 2990,
    currency: "BRL",
    billingPeriod: "monthly",
    permissions: ["view_dashboard","view_monitor","view_bulk_check","view_gifters","view_country_leaderboard","view_gift_gallery","use_watchlist"],
    tiktokUsernameChangesPerWeek: 1,
    maxConcurrentWs: 3,
    maxApiCallsPerWindow: 100,
    maxLiveHoursPerMonth: 30,
    maxLiveHoursPerDay: 6,
    maxLiveAnalyses: 100,
    maxWebhooks: 3,
    maxActiveOverlays: 5,
    maxActiveScoreboards: 3,
    maxActiveMinigames: 3,
    maxAiChatMessagesPerDay: 20,
    maxAiVideoGenerationsPerMonth: 2,
    features: ["Tudo do Gratuito","Bulk Check","Gifters Leaderboard","Watchlist","30h de live/mês","3 webhooks"],
    color: "cyan",
    order: 1,
    isActive: true,
  },
  {
    id: "pro",
    name: "PRO",
    description: "Acesso completo a todas as funcionalidades",
    price: 5990,
    currency: "BRL",
    billingPeriod: "monthly",
    permissions: ["view_dashboard","view_monitor","view_bulk_check","view_gaming_leaderboard","view_gifters","view_webhooks","view_live_captions","view_live_analytics","view_country_leaderboard","view_gift_gallery","use_watchlist","use_jwt"],
    tiktokUsernameChangesPerWeek: -1,
    maxConcurrentWs: 10,
    maxApiCallsPerWindow: 500,
    maxLiveHoursPerMonth: -1,
    maxLiveHoursPerDay: -1,
    maxLiveAnalyses: -1,
    maxWebhooks: -1,
    maxActiveOverlays: -1,
    maxActiveScoreboards: -1,
    maxActiveMinigames: -1,
    maxAiChatMessagesPerDay: -1,
    maxAiVideoGenerationsPerMonth: 20,
    features: ["Tudo do Basic","Gaming Leaderboard","Webhooks ilimitados","Live Captions","Live Analytics","JWT/WebSocket","Live ilimitada"],
    color: "violet",
    order: 2,
    isActive: true,
  },
];

export async function seedDefaultPlans(): Promise<void> {
  const existing = await db.select().from(plansTable);
  if (existing.length === 0) {
    await db.insert(plansTable).values(DEFAULT_PLANS);
  }
}

export async function getAllPlans(): Promise<Plan[]> {
  const rows = await db.select().from(plansTable).orderBy(plansTable.order);
  return rows;
}

export async function getPlanById(id: string): Promise<Plan | null> {
  const rows = await db.select().from(plansTable).where(eq(plansTable.id, id));
  return rows[0] ?? null;
}

export async function createPlan(data: InsertPlan): Promise<Plan> {
  const rows = await db.insert(plansTable).values(data).returning();
  return rows[0];
}

export async function updatePlan(id: string, data: Partial<InsertPlan>): Promise<Plan | null> {
  const rows = await db.update(plansTable).set(data).where(eq(plansTable.id, id)).returning();
  return rows[0] ?? null;
}

export async function deletePlan(id: string): Promise<void> {
  await db.delete(plansTable).where(eq(plansTable.id, id));
}
