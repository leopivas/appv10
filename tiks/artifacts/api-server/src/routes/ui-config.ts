import { Router, type IRouter } from "express";
import { requireAdminMiddleware } from "./auth";
import { loadUIConfig, saveUIConfig, getDefaultUIConfig, type UIConfig } from "../lib/ui-config-store";

const router: IRouter = Router();

// GET /ui-config — public
router.get("/ui-config", async (_req, res): Promise<void> => {
  res.json(await loadUIConfig());
});

// PATCH /admin/ui-config
router.patch("/admin/ui-config", requireAdminMiddleware, async (req, res): Promise<void> => {
  const body = req.body as Partial<UIConfig>;
  const cfg = await loadUIConfig();

  if (body.navType !== undefined) cfg.navType = body.navType;
  if (body.primaryColor !== undefined) cfg.primaryColor = body.primaryColor;
  if (body.secondaryColor !== undefined) cfg.secondaryColor = body.secondaryColor;
  if (body.logoText !== undefined) cfg.logoText = body.logoText;
  if (body.logoUrl !== undefined) cfg.logoUrl = body.logoUrl;
  if (Array.isArray(body.sidebarSections)) cfg.sidebarSections = body.sidebarSections;
  if (body.headerConfig !== undefined) cfg.headerConfig = body.headerConfig;
  if (Array.isArray(body.featuredSlides)) cfg.featuredSlides = body.featuredSlides;
  cfg.updatedAt = new Date().toISOString();

  await saveUIConfig(cfg);
  res.json(cfg);
});

// POST /admin/ui-config/reset
router.post("/admin/ui-config/reset", requireAdminMiddleware, async (_req, res): Promise<void> => {
  const defaults = getDefaultUIConfig();
  await saveUIConfig(defaults);
  res.json(defaults);
});

export default router;
