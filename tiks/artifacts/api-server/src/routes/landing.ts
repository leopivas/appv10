import { Router, type Request, type Response } from "express";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { requireAuth, requireAdminMiddleware as requireAdmin } from "./auth";

const router = Router();

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();
const dataDir = path.resolve(workspaceRoot, "artifacts/api-server/data");
const DATA_FILE = path.resolve(dataDir, "landing.json");
const CONFIG_FILE = path.resolve(dataDir, "config.json");

const TIKTOOLS_API = "https://api.tik.tools";

function loadApiKey(): string {
  const envKey = process.env.TIKTOOLS_API_KEY;
  if (envKey) return envKey;
  try {
    const cfg = JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) as { apiKey?: string };
    if (cfg.apiKey) return cfg.apiKey;
  } catch { /* ignore */ }
  throw new Error("TIKTOOLS_API_KEY not configured");
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LandingFeature {
  id: string;
  title: string;
  description: string;
  icon: string;
  imageUrl: string;
  demoUrl: string;
  order: number;
}

export interface LandingPartner {
  id: string;
  tiktokHandle: string;
  displayName: string;
  avatarUrl: string;
  followers: number;
  addedAt: string;
}

export interface LandingContent {
  enabled: boolean;
  hero: {
    headline: string;
    subheadline: string;
    ctaLabel: string;
    backgroundGradient: string;
  };
  features: LandingFeature[];
  partners: LandingPartner[];
  plans: {
    visiblePlanIds: string[];
    recommendedPlanId: string;
  };
  cta: {
    text: string;
    subtext: string;
    buttonLabel: string;
  };
}

const DEFAULT_CONTENT: LandingContent = {
  enabled: true,
  hero: {
    headline: "A plataforma completa para streamers do TikTok LIVE",
    subheadline: "Overlays, rankings, alertas, análises e muito mais — tudo que você precisa para profissionalizar sua live, em um só lugar.",
    ctaLabel: "Começar Grátis",
    backgroundGradient: "from-violet-900/40 via-purple-900/20 to-cyan-900/20",
  },
  features: [],
  partners: [],
  plans: {
    visiblePlanIds: ["free", "basic", "pro"],
    recommendedPlanId: "basic",
  },
  cta: {
    text: "Comece a profissionalizar sua live hoje",
    subtext: "Crie sua conta grátis e acesse overlays, analytics e ferramentas profissionais agora mesmo.",
    buttonLabel: "Criar Conta Grátis",
  },
};

function loadContent(): LandingContent {
  if (!existsSync(DATA_FILE)) return DEFAULT_CONTENT;
  try {
    const raw = JSON.parse(readFileSync(DATA_FILE, "utf-8")) as Partial<LandingContent>;
    return { ...DEFAULT_CONTENT, ...raw, partners: raw.partners ?? [] };
  } catch {
    return DEFAULT_CONTENT;
  }
}

function saveContent(content: LandingContent): void {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(content, null, 2));
}


// ── Helper: fetch TikTok profile from tik.tools ───────────────────────────────

interface TikToolsProfile {
  displayName: string;
  avatarUrl: string;
  followers: number;
}

async function fetchTikTokProfile(handle: string): Promise<TikToolsProfile> {
  const clean = handle.replace(/^@/, "");
  try {
    // Scrape TikTok's embedded __UNIVERSAL_DATA_FOR_REHYDRATION__ JSON — free, no API key
    const r = await fetch(`https://www.tiktok.com/@${encodeURIComponent(clean)}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });
    if (!r.ok) return { displayName: clean, avatarUrl: "", followers: 0 };

    const html = await r.text();
    const match = html.match(
      /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([^<]+)<\/script>/,
    );
    if (!match?.[1]) return { displayName: clean, avatarUrl: "", followers: 0 };

    const json = JSON.parse(match[1]) as {
      __DEFAULT_SCOPE__?: {
        "webapp.user-detail"?: {
          userInfo?: {
            user?: { nickname?: string; avatarLarger?: string; uniqueId?: string };
            stats?: { followerCount?: number };
          };
        };
      };
    };

    const info = json.__DEFAULT_SCOPE__?.["webapp.user-detail"]?.userInfo;
    if (!info) return { displayName: clean, avatarUrl: "", followers: 0 };

    return {
      displayName: info.user?.nickname ?? info.user?.uniqueId ?? clean,
      avatarUrl: info.user?.avatarLarger ?? "",
      followers: info.stats?.followerCount ?? 0,
    };
  } catch {
    return { displayName: clean, avatarUrl: "", followers: 0 };
  }
}

// ── Helper: bulk live check ───────────────────────────────────────────────────

async function bulkLiveCheck(handles: string[]): Promise<Record<string, { isLive: boolean; viewerCount: number }>> {
  if (!handles.length) return {};
  try {
    const apiKey = loadApiKey();
    const clean = handles.map((h) => h.replace(/^@/, ""));
    const r = await fetch(`${TIKTOOLS_API}/webcast/bulk_live_check?apiKey=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unique_ids: clean }),
    });
    if (!r.ok) return {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = (await r.json()) as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: Record<string, { isLive: boolean; viewerCount: number }> = {};
    // Shape: { data: { uniqueId: { is_alive, viewer_count } } } or array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = json?.data ?? json;
    if (Array.isArray(data)) {
      for (const item of data) {
        const uid: string = item?.uniqueId ?? item?.unique_id ?? "";
        if (uid) results[uid.toLowerCase()] = { isLive: !!(item?.is_alive || item?.isLive), viewerCount: item?.viewer_count ?? item?.viewerCount ?? 0 };
      }
    } else if (data && typeof data === "object") {
      for (const [uid, val] of Object.entries(data)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const v = val as any;
        results[uid.toLowerCase()] = { isLive: !!(v?.is_alive || v?.isLive), viewerCount: v?.viewer_count ?? v?.viewerCount ?? 0 };
      }
    }
    return results;
  } catch {
    return {};
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/landing — public
router.get("/landing", (_req: Request, res: Response): void => {
  const content = loadContent();
  res.json(content);
});

// PUT /api/landing — admin only
router.put("/landing", requireAdmin, (req: Request, res: Response): void => {
  const body = req.body as Partial<LandingContent>;
  const current = loadContent();

  const updated: LandingContent = {
    enabled: body.enabled !== undefined ? !!body.enabled : current.enabled,
    hero: body.hero ? { ...current.hero, ...body.hero } : current.hero,
    features: Array.isArray(body.features) ? body.features : current.features,
    partners: Array.isArray(body.partners) ? body.partners : current.partners,
    plans: body.plans ? { ...current.plans, ...body.plans } : current.plans,
    cta: body.cta ? { ...current.cta, ...body.cta } : current.cta,
  };

  saveContent(updated);
  res.json(updated);
});

// GET /api/landing/partners — public, returns partners with live status
router.get("/landing/partners", async (_req: Request, res: Response): Promise<void> => {
  const content = loadContent();
  const partners = content.partners ?? [];

  const liveStatus = await bulkLiveCheck(partners.map((p) => p.tiktokHandle));

  const withStatus = partners.map((p) => {
    const key = p.tiktokHandle.replace(/^@/, "").toLowerCase();
    const status = liveStatus[key] ?? { isLive: false, viewerCount: 0 };
    return { ...p, isLive: status.isLive, viewerCount: status.viewerCount };
  });

  res.json({ partners: withStatus });
});

// POST /api/landing/partners — admin, add by tiktok handle
router.post("/landing/partners", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const body = req.body as { tiktokHandle?: string; avatarUrl?: string; displayName?: string; followers?: number };
  if (!body.tiktokHandle?.trim()) {
    res.status(400).json({ error: "tiktokHandle is required" });
    return;
  }

  const handle = body.tiktokHandle.trim().replace(/^@/, "");

  // Allow manual override; fall back to auto-fetch (Pro tier needed)
  let displayName = body.displayName?.trim() || handle;
  let avatarUrl = body.avatarUrl?.trim() || "";
  let followers = typeof body.followers === "number" ? body.followers : 0;

  if (!body.displayName && !body.avatarUrl) {
    try {
      const profile = await fetchTikTokProfile(handle);
      displayName = profile.displayName || handle;
      avatarUrl = profile.avatarUrl;
      followers = profile.followers;
    } catch { /* proceed with minimal data */ }
  }

  const content = loadContent();
  const existing = content.partners.find(
    (p) => p.tiktokHandle.toLowerCase() === handle.toLowerCase(),
  );
  if (existing) {
    res.status(409).json({ error: "Partner already added" });
    return;
  }

  const partner: LandingPartner = {
    id: crypto.randomUUID(),
    tiktokHandle: handle,
    displayName,
    avatarUrl,
    followers,
    addedAt: new Date().toISOString(),
  };

  content.partners.push(partner);
  saveContent(content);
  res.status(201).json(partner);
});

// PATCH /api/landing/partners/:id — admin, manually update partner fields
router.patch("/landing/partners/:id", requireAdmin, (req: Request, res: Response): void => {
  const { id } = req.params;
  const body = req.body as { displayName?: string; avatarUrl?: string; followers?: number | string };
  const content = loadContent();
  const idx = content.partners.findIndex((p) => p.id === id);
  if (idx === -1) { res.status(404).json({ error: "Partner not found" }); return; }
  const p = content.partners[idx]!;
  if (body.displayName !== undefined) p.displayName = String(body.displayName).trim() || p.tiktokHandle;
  if (body.avatarUrl !== undefined) p.avatarUrl = String(body.avatarUrl).trim();
  if (body.followers !== undefined) {
    // Strip thousand separators (., space) and parse — handles "2.000.000", "2,000,000", "2000000"
    const clean = String(body.followers).replace(/[.,\s]/g, "");
    p.followers = parseInt(clean, 10) || 0;
  }
  content.partners[idx] = p;
  saveContent(content);
  res.json(p);
});

// DELETE /api/landing/partners/:id — admin, remove partner
router.delete("/landing/partners/:id", requireAdmin, (req: Request, res: Response): void => {
  const { id } = req.params;
  const content = loadContent();
  const before = content.partners.length;
  content.partners = content.partners.filter((p) => p.id !== id);
  if (content.partners.length === before) {
    res.status(404).json({ error: "Partner not found" });
    return;
  }
  saveContent(content);
  res.json({ ok: true });
});

// POST /api/landing/partners/:id/refresh — admin, refresh profile data
router.post("/landing/partners/:id/refresh", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const content = loadContent();
  const idx = content.partners.findIndex((p) => p.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Partner not found" });
    return;
  }
  try {
    const partner = content.partners[idx]!;
    const profile = await fetchTikTokProfile(partner.tiktokHandle);
    content.partners[idx] = { ...partner, ...profile };
    saveContent(content);
    res.json(content.partners[idx]);
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
});

export default router;
