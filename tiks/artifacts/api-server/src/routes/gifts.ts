import { Router, type IRouter } from "express";
import { requireAdminMiddleware } from "./auth";
import { invalidateGiftCache } from "./tiktok";
import fs from "fs";
import path from "path";

const router: IRouter = Router();

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();
const dataDir = path.resolve(workspaceRoot, "artifacts/api-server/data");
const settingsFile = path.resolve(dataDir, "gifts-settings.json");
const customGiftsFile = path.resolve(dataDir, "gifts-custom.json");

interface GiftSettings {
  brlPerUsd: number;
}

interface CustomGift {
  id: string;
  name: string;
  iconUrl: string;
  diamondCount: number;
  source: "custom";
  createdAt: string;
  updatedAt: string;
}

function loadSettings(): GiftSettings {
  try {
    if (fs.existsSync(settingsFile)) {
      return JSON.parse(fs.readFileSync(settingsFile, "utf-8")) as GiftSettings;
    }
  } catch { /* ignore */ }
  return { brlPerUsd: 5.5 };
}

function saveSettings(s: GiftSettings): void {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(settingsFile, JSON.stringify(s, null, 2));
}

function loadCustomGifts(): CustomGift[] {
  try {
    if (fs.existsSync(customGiftsFile)) {
      return JSON.parse(fs.readFileSync(customGiftsFile, "utf-8")) as CustomGift[];
    }
  } catch { /* ignore */ }
  return [];
}

function saveCustomGifts(gifts: CustomGift[]): void {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(customGiftsFile, JSON.stringify(gifts, null, 2));
}

// GET /api/admin/gifts/settings
router.get("/admin/gifts/settings", requireAdminMiddleware, (_req, res): void => {
  res.json(loadSettings());
});

// PATCH /api/admin/gifts/settings
router.patch("/admin/gifts/settings", requireAdminMiddleware, (req, res): void => {
  const { brlPerUsd } = req.body as { brlPerUsd?: number };
  const s = loadSettings();
  if (typeof brlPerUsd === "number" && brlPerUsd > 0) s.brlPerUsd = brlPerUsd;
  saveSettings(s);
  invalidateGiftCache();
  req.log.info({ brlPerUsd: s.brlPerUsd }, "Gift settings updated");
  res.json({ ok: true, settings: s });
});

// GET /api/admin/gifts/custom
router.get("/admin/gifts/custom", requireAdminMiddleware, (_req, res): void => {
  res.json(loadCustomGifts());
});

// POST /api/admin/gifts/custom
router.post("/admin/gifts/custom", requireAdminMiddleware, (req, res): void => {
  const { name, iconUrl, diamondCount } = req.body as {
    name?: string; iconUrl?: string; diamondCount?: number;
  };
  if (!name || typeof diamondCount !== "number" || diamondCount < 0) {
    res.status(400).json({ error: "name and diamondCount (>= 0) are required" });
    return;
  }
  const gifts = loadCustomGifts();
  const now = new Date().toISOString();
  const newGift: CustomGift = {
    id: `custom-${Date.now()}`,
    name: name.trim(),
    iconUrl: (iconUrl ?? "").trim(),
    diamondCount,
    source: "custom",
    createdAt: now,
    updatedAt: now,
  };
  gifts.push(newGift);
  saveCustomGifts(gifts);
  invalidateGiftCache();
  req.log.info({ id: newGift.id, name: newGift.name }, "Custom gift created");
  res.status(201).json(newGift);
});

// PATCH /api/admin/gifts/custom/:id
router.patch("/admin/gifts/custom/:id", requireAdminMiddleware, (req, res): void => {
  const { id } = req.params as { id: string };
  const { name, iconUrl, diamondCount } = req.body as {
    name?: string; iconUrl?: string; diamondCount?: number;
  };
  const gifts = loadCustomGifts();
  const idx = gifts.findIndex((g) => g.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Gift not found" });
    return;
  }
  const gift = gifts[idx];
  if (name !== undefined) gift.name = name.trim();
  if (iconUrl !== undefined) gift.iconUrl = iconUrl.trim();
  if (typeof diamondCount === "number" && diamondCount >= 0) gift.diamondCount = diamondCount;
  gift.updatedAt = new Date().toISOString();
  saveCustomGifts(gifts);
  invalidateGiftCache();
  req.log.info({ id }, "Custom gift updated");
  res.json(gift);
});

// DELETE /api/admin/gifts/custom/:id
router.delete("/admin/gifts/custom/:id", requireAdminMiddleware, (req, res): void => {
  const { id } = req.params as { id: string };
  const gifts = loadCustomGifts();
  const before = gifts.length;
  const updated = gifts.filter((g) => g.id !== id);
  if (updated.length === before) {
    res.status(404).json({ error: "Gift not found" });
    return;
  }
  saveCustomGifts(updated);
  invalidateGiftCache();
  req.log.info({ id }, "Custom gift deleted");
  res.json({ ok: true });
});

export default router;
