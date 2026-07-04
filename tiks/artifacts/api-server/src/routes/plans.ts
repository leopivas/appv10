import { Router, type IRouter } from "express";
import { requireAdminMiddleware } from "./auth";
import { getAllPlans, getPlanById, createPlan, updatePlan, deletePlan, type Plan } from "../lib/plans-store";
import { ALL_PERMISSIONS } from "../lib/roles-store";
import { getAllUsers } from "../lib/users-store";

const router: IRouter = Router();

// GET /admin/plans
router.get("/admin/plans", async (_req, res): Promise<void> => {
  const plans = await getAllPlans();
  res.json({ plans, permissions: ALL_PERMISSIONS });
});

// PATCH /admin/plans/:id
router.patch("/admin/plans/:id", requireAdminMiddleware, async (req, res): Promise<void> => {
  const { id } = req.params as { id: string };
  const body = req.body as Partial<Plan>;

  const plan = await getPlanById(id);
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }

  const updates: Partial<Plan> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.price !== undefined) updates.price = Number(body.price);
  if (body.currency !== undefined) updates.currency = body.currency;
  if (body.billingPeriod !== undefined) updates.billingPeriod = body.billingPeriod;
  if (Array.isArray(body.permissions)) updates.permissions = body.permissions;
  if (body.tiktokUsernameChangesPerWeek !== undefined) updates.tiktokUsernameChangesPerWeek = Number(body.tiktokUsernameChangesPerWeek);
  if (body.maxConcurrentWs !== undefined) updates.maxConcurrentWs = Number(body.maxConcurrentWs);
  if (body.maxApiCallsPerWindow !== undefined) updates.maxApiCallsPerWindow = Number(body.maxApiCallsPerWindow);
  if (body.maxLiveHoursPerMonth !== undefined) updates.maxLiveHoursPerMonth = Number(body.maxLiveHoursPerMonth);
  if (body.maxLiveAnalyses !== undefined) updates.maxLiveAnalyses = Number(body.maxLiveAnalyses);
  if (body.maxWebhooks !== undefined) updates.maxWebhooks = Number(body.maxWebhooks);
  if (Array.isArray(body.features)) updates.features = body.features;
  if (body.color !== undefined) updates.color = body.color;
  if (body.isActive !== undefined) updates.isActive = body.isActive;
  if (body.order !== undefined) updates.order = Number(body.order);

  const updated = await updatePlan(id, updates);
  res.json({ plan: updated });
});

// POST /admin/plans
router.post("/admin/plans", requireAdminMiddleware, async (req, res): Promise<void> => {
  const body = req.body as Partial<Plan> & { id?: string; name?: string };
  if (!body.id || !body.name) { res.status(400).json({ error: "id e name são obrigatórios" }); return; }

  const existing = await getPlanById(body.id);
  if (existing) { res.status(409).json({ error: "Já existe um plano com este ID" }); return; }

  const allPlans = await getAllPlans();
  const newPlan = await createPlan({
    id: body.id,
    name: body.name,
    description: body.description ?? "",
    price: Number(body.price ?? 0),
    currency: body.currency ?? "BRL",
    billingPeriod: body.billingPeriod ?? "monthly",
    permissions: Array.isArray(body.permissions) ? body.permissions : [],
    tiktokUsernameChangesPerWeek: Number(body.tiktokUsernameChangesPerWeek ?? 1),
    maxConcurrentWs: Number(body.maxConcurrentWs ?? 1),
    maxApiCallsPerWindow: Number(body.maxApiCallsPerWindow ?? 50),
    maxLiveHoursPerMonth: Number(body.maxLiveHoursPerMonth ?? 10),
    maxLiveAnalyses: Number(body.maxLiveAnalyses ?? 50),
    maxWebhooks: Number(body.maxWebhooks ?? 0),
    features: Array.isArray(body.features) ? body.features : [],
    color: body.color ?? "gray",
    order: Number(body.order ?? allPlans.length),
    isActive: body.isActive ?? false,
  });

  res.status(201).json({ plan: newPlan });
});

// DELETE /admin/plans/:id
router.delete("/admin/plans/:id", requireAdminMiddleware, async (req, res): Promise<void> => {
  const { id } = req.params as { id: string };
  const PROTECTED = ["free", "basic", "pro"];
  if (PROTECTED.includes(id)) { res.status(403).json({ error: "Os planos padrão não podem ser removidos" }); return; }

  const plan = await getPlanById(id);
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }

  await deletePlan(id);
  res.json({ ok: true });
});

// GET /admin/plans/:id/username-change-stats
router.get("/admin/plans/:id/username-change-stats", requireAdminMiddleware, async (req, res): Promise<void> => {
  const { id } = req.params as { id: string };
  const plan = await getPlanById(id);
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }

  const users = await getAllUsers();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const stats = users
    .filter((u) => u.plan === id)
    .map((u) => {
      const changesThisWeek = (u.tiktokUsernameChangeLog ?? []).filter((ts) => new Date(ts).getTime() > weekAgo).length;
      const limit = plan.tiktokUsernameChangesPerWeek;
      return { userId: u.id, name: u.name, email: u.email, changesThisWeek, limit: limit === -1 ? "unlimited" : limit, blocked: limit !== -1 && changesThisWeek >= limit };
    });

  res.json({ planId: id, stats });
});

export default router;
