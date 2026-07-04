import { Router, type IRouter } from "express";
import {
  GetLiveStatusQueryParams,
  MintJwtBody,
  GetRoomInfoBody,
  BulkLiveCheckBody,
  GetUserProfileQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "./auth";
import { getUserById, updateUser } from "../lib/users-store";
import fs from "fs";
import path from "path";

const router: IRouter = Router();

const TIKTOOLS_API = "https://api.tik.tools";

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();
const configFile = path.resolve(workspaceRoot, "artifacts/api-server/data/config.json");

function loadPersistedApiKey(): string | undefined {
  try {
    if (fs.existsSync(configFile)) {
      const cfg = JSON.parse(fs.readFileSync(configFile, "utf-8")) as { apiKey?: string };
      return cfg.apiKey || undefined;
    }
  } catch { /* ignore */ }
  return undefined;
}

function getApiKey(): string {
  const key = process.env.TIKTOOLS_API_KEY || loadPersistedApiKey();
  if (!key) throw new Error("TIKTOOLS_API_KEY não configurada");
  return key;
}

// Raw API gift cache — only stores what tik.tools returned; BRL/custom applied fresh per request
type RawGift = { id: string; name: string; iconUrl: string; diamondCount: number; rank: number };
let rawApiGiftCache: { data: RawGift[]; ts: number } | null = null;
const GIFT_CACHE_TTL = 1000 * 60 * 60; // 1 hour

/** Called by the gifts admin router whenever settings or custom gifts change */
export function invalidateGiftCache(): void {
  rawApiGiftCache = null;
}

const staticGiftsFile = path.resolve(workspaceRoot, "artifacts/api-server/data/gifts-static.json");
const giftSettingsFile = path.resolve(workspaceRoot, "artifacts/api-server/data/gifts-settings.json");
const customGiftsFile = path.resolve(workspaceRoot, "artifacts/api-server/data/gifts-custom.json");

interface StaticGift { id: string; name: string; iconUrl: string; diamondCount: number; rank?: number; }
interface GiftSettings { brlPerUsd: number; }
interface CustomGift { id: string; name: string; iconUrl: string; diamondCount: number; source: string; }

function loadStaticGifts(): StaticGift[] {
  try {
    if (fs.existsSync(staticGiftsFile)) {
      return JSON.parse(fs.readFileSync(staticGiftsFile, "utf-8")) as StaticGift[];
    }
  } catch { /* ignore */ }
  return [];
}

function loadGiftSettings(): GiftSettings {
  try {
    if (fs.existsSync(giftSettingsFile)) {
      return JSON.parse(fs.readFileSync(giftSettingsFile, "utf-8")) as GiftSettings;
    }
  } catch { /* ignore */ }
  return { brlPerUsd: 5.5 };
}

function loadCustomGifts(): CustomGift[] {
  try {
    if (fs.existsSync(customGiftsFile)) {
      return JSON.parse(fs.readFileSync(customGiftsFile, "utf-8")) as CustomGift[];
    }
  } catch { /* ignore */ }
  return [];
}

/** Build the final gift list from raw API/static base + fresh admin settings and custom gifts */
function buildGiftList(
  rawBase: RawGift[],
  brlPerUsd: number
) {
  const COIN_TO_USD = 0.005;
  const customGifts = loadCustomGifts();
  const customMap = new Map(customGifts.map((g) => [g.id, g]));
  // Apply custom overrides on top of base
  const merged: RawGift[] = rawBase.map((g) =>
    customMap.has(g.id) ? { ...g, ...customMap.get(g.id) } : g
  );
  // Append custom gifts that don't appear in base list
  const baseIds = new Set(rawBase.map((g) => g.id));
  let appendRank = rawBase.length;
  for (const cg of customGifts) {
    if (!baseIds.has(cg.id)) {
      merged.push({ ...cg, rank: appendRank++ });
    }
  }
  return merged.map((g) => ({
    id: g.id,
    name: g.name,
    iconUrl: g.iconUrl,
    diamondCount: g.diamondCount,
    rank: g.rank,
    valueUsd: parseFloat((g.diamondCount * COIN_TO_USD).toFixed(2)),
    valueBrl: parseFloat((g.diamondCount * COIN_TO_USD * brlPerUsd).toFixed(2)),
  }));
}

// ── Top Channels ─────────────────────────────────────────────────────────────
router.get("/tiktok/top-channels", async (req, res): Promise<void> => {
  try {
    const r = await fetch(`${TIKTOOLS_API}/api/live/top-channels`);
    const json = await r.json() as {
      channels?: Array<{
        uniqueId?: string;
        displayName?: string;
        profilePictureUrl?: string | null;
        roomId?: string;
        viewerCount?: number;
        title?: string | null;
        region?: string | null;
      }>;
    };
    const channels = (json.channels ?? []).map((c) => ({
      uniqueId: c.uniqueId ?? "",
      nickname: c.displayName ?? null,
      profilePictureUrl: c.profilePictureUrl ?? null,
      roomId: c.roomId ?? null,
      viewerCount: c.viewerCount ?? null,
      title: c.title ?? null,
      region: c.region ?? null,
    }));
    res.json(channels);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch top channels");
    res.status(500).json({ error: "Failed to fetch top channels" });
  }
});

// ── Public: verify TikTok username (used during registration, no auth needed) ──
router.get("/tiktok/verify-username", async (req, res): Promise<void> => {
  const { uniqueId } = req.query as { uniqueId?: string };
  if (!uniqueId || uniqueId.trim().length < 2) {
    res.status(400).json({ error: "uniqueId is required" }); return;
  }
  const handle = uniqueId.trim().replace(/^@/, "");
  try {
    const apiKey = process.env.TIKTOOLS_API_KEY;
    if (!apiKey) {
      // No API key: cannot verify — return null so the UI doesn't block the user
      res.json({ exists: null, uniqueId: handle, reason: "no_api_key" }); return;
    }
    // Use user-profile endpoint for full data
    const r = await fetch(
      `${TIKTOOLS_API}/api/user/profile?apiKey=${apiKey}&uniqueId=${encodeURIComponent(handle)}`
    );
    if (r.status === 404 || r.status === 400) {
      res.json({ exists: false, uniqueId: handle }); return;
    }
    const json = await r.json() as {
      uniqueId?: string;
      nickname?: string;
      profilePictureUrl?: string | null;
      followerCount?: number;
      followingCount?: number;
      bioDescription?: string | null;
      verified?: boolean;
    };

    if (!json.uniqueId) {
      res.json({ exists: false, uniqueId: handle }); return;
    }

    res.json({
      exists: true,
      uniqueId: json.uniqueId,
      nickname: json.nickname ?? null,
      profilePictureUrl: json.profilePictureUrl ?? null,
      followerCount: json.followerCount ?? 0,
      followingCount: json.followingCount ?? 0,
      bioDescription: json.bioDescription ?? null,
      verified: json.verified ?? false,
    });
  } catch (err) {
    req.log.warn({ err, handle }, "Failed to verify TikTok username");
    // Soft fail — do not block registration on API errors
    res.json({ exists: null, uniqueId: handle, error: "lookup_failed" });
  }
});

// ── Live Status ───────────────────────────────────────────────────────────────
router.get("/tiktok/live-status", requireAuth, async (req, res): Promise<void> => {
  const parsed = GetLiveStatusQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const apiKey = getApiKey();
    const r = await fetch(
      `${TIKTOOLS_API}/webcast/live_status?apiKey=${apiKey}&unique_id=${encodeURIComponent(parsed.data.uniqueId)}`
    );
    const json = await r.json() as {
      status_code?: number;
      data?: { unique_id?: string; is_live?: boolean; room_id?: string; cached?: boolean };
    };
    const data = json.data ?? {};
    res.json({
      uniqueId: data.unique_id ?? parsed.data.uniqueId,
      isLive: data.is_live ?? false,
      roomId: data.room_id ?? null,
      cached: data.cached ?? false,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to check live status");
    res.status(500).json({ error: "Failed to check live status" });
  }
});

// ── Check Alive ───────────────────────────────────────────────────────────────
router.get("/tiktok/check-alive", requireAuth, async (req, res): Promise<void> => {
  const { unique_id, room_ids } = req.query as { unique_id?: string; room_ids?: string };
  if (!unique_id && !room_ids) {
    res.status(400).json({ error: "unique_id or room_ids query param required" });
    return;
  }
  try {
    const apiKey = getApiKey();
    const params = new URLSearchParams({ apiKey });
    if (unique_id) params.set("unique_id", unique_id);
    if (room_ids) params.set("room_ids", room_ids);
    const r = await fetch(`${TIKTOOLS_API}/webcast/check_alive?${params}`);
    const json = await r.json() as {
      status_code?: number;
      data?: Array<{ room_id?: string; alive?: boolean; title?: string; userCount?: number }>;
    };
    res.json({
      statusCode: json.status_code ?? 0,
      data: (json.data ?? []).map((d) => ({
        roomId: d.room_id ?? null,
        alive: d.alive ?? false,
        title: d.title ?? null,
        userCount: d.userCount ?? null,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to check alive");
    res.status(500).json({ error: "Failed to check alive" });
  }
});

// ── Live Connect (JWT + stream URLs bundled) ──────────────────────────────────
router.get("/tiktok/live-connect", requireAuth, async (req, res): Promise<void> => {
  const { uniqueId } = req.query as { uniqueId?: string };
  if (!uniqueId) {
    res.status(400).json({ error: "uniqueId query param required" });
    return;
  }
  try {
    const apiKey = getApiKey();
    const r = await fetch(
      `${TIKTOOLS_API}/api/live/connect?uniqueId=${encodeURIComponent(uniqueId)}&apiKey=${apiKey}`
    );
    const json = await r.json();
    res.json(json);

    // Increment totalLiveSessions when owner monitors their own TikTok live
    const userId = (req as typeof req & { userId: string }).userId;
    void getUserById(userId).then((u) => {
      if (u && u.tiktokUsername?.toLowerCase() === uniqueId.toLowerCase()) {
        void updateUser(userId, { totalLiveSessions: (u.totalLiveSessions ?? 0) + 1 });
      }
    }).catch(() => { /* best-effort */ });
  } catch (err) {
    req.log.error({ err }, "Failed to live connect");
    res.status(500).json({ error: "Failed to live connect" });
  }
});

// ── JWT Mint ──────────────────────────────────────────────────────────────────
router.post("/tiktok/jwt", requireAuth, async (req, res): Promise<void> => {
  const parsed = MintJwtBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const apiKey = getApiKey();
    const expireAfter = parsed.data.expireAfter ?? 600;
    const r = await fetch(`${TIKTOOLS_API}/authentication/jwt?apiKey=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        allowed_creators: [parsed.data.uniqueId],
        expire_after: expireAfter,
        max_websockets: 1,
      }),
    });
    const json = await r.json() as { data?: { token?: string } };
    const token = json.data?.token;
    if (!token) {
      req.log.warn({ json }, "JWT mint returned no token");
      res.status(502).json({ error: "Failed to mint JWT token" });
      return;
    }
    res.json({ token, uniqueId: parsed.data.uniqueId });
  } catch (err) {
    req.log.error({ err }, "Failed to mint JWT");
    res.status(500).json({ error: "Failed to mint JWT" });
  }
});

// ── Room Info ─────────────────────────────────────────────────────────────────
router.post("/tiktok/room-info", requireAuth, async (req, res): Promise<void> => {
  const parsed = GetRoomInfoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const apiKey = getApiKey();

    // Resolve room_id via live_status if not provided directly
    let roomId = parsed.data.roomId ?? null;
    if (!roomId && parsed.data.uniqueId) {
      const statusR = await fetch(
        `${TIKTOOLS_API}/webcast/live_status?apiKey=${apiKey}&unique_id=${encodeURIComponent(parsed.data.uniqueId)}`
      );
      const statusJson = await statusR.json() as { data?: { room_id?: string } };
      roomId = statusJson.data?.room_id ?? null;
    }

    if (!roomId) {
      res.json({ roomId: null, alive: false, title: null, viewerCount: null, likeCount: null, owner: null });
      return;
    }

    const r = await fetch(`${TIKTOOLS_API}/webcast/room_info?apiKey=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room_id: roomId }),
    });
    const json = await r.json() as {
      status_code?: number;
      data?: {
        room_id?: string;
        alive?: boolean;
        title?: string;
        user_count?: number;
        like_count?: number;
        owner?: {
          unique_id?: string;
          display_id?: string;
          nickname?: string;
          avatar_thumb?: { url_list?: string[] };
        };
      };
    };

    const data = json.data ?? {};
    res.json({
      roomId: data.room_id ?? roomId,
      alive: data.alive ?? false,
      title: data.title ?? null,
      viewerCount: data.user_count ?? null,
      likeCount: data.like_count ?? null,
      owner: data.owner
        ? {
            uniqueId: data.owner.unique_id ?? data.owner.display_id ?? null,
            nickname: data.owner.nickname ?? null,
            profilePictureUrl: data.owner.avatar_thumb?.url_list?.[0] ?? null,
          }
        : null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch room info");
    res.status(500).json({ error: "Failed to fetch room info" });
  }
});

// ── Webcast Fetch (HTTP long-polling alternative to WebSocket) ────────────────
router.post("/tiktok/webcast-fetch", requireAuth, async (req, res): Promise<void> => {
  const { unique_id, room_id, cursor } = req.body as { unique_id?: string; room_id?: string; cursor?: string };
  if (!unique_id && !room_id) {
    res.status(400).json({ error: "unique_id or room_id required in body" });
    return;
  }
  try {
    const apiKey = getApiKey();
    const r = await fetch(`${TIKTOOLS_API}/webcast/fetch?apiKey=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unique_id, room_id, cursor }),
    });
    const json = await r.json();
    res.json(json);
  } catch (err) {
    req.log.error({ err }, "Failed to webcast fetch");
    res.status(500).json({ error: "Failed to webcast fetch" });
  }
});

// ── Bulk Live Check ───────────────────────────────────────────────────────────
router.post("/tiktok/bulk-check", requireAuth, async (req, res): Promise<void> => {
  const parsed = BulkLiveCheckBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const apiKey = getApiKey();
    const { uniqueIds } = parsed.data;

    // Try bulk endpoint first (Basic+ only)
    const bulkR = await fetch(`${TIKTOOLS_API}/webcast/bulk_live_check?apiKey=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unique_ids: uniqueIds }),
    });
    const bulkJson = await bulkR.json() as {
      status_code?: number;
      data?: Array<{
        unique_id?: string;
        is_live?: boolean;
        room_id?: string;
        title?: string;
        user_count?: number;
      }>;
    };

    if (bulkJson.status_code === 0 && Array.isArray(bulkJson.data)) {
      const results = bulkJson.data.map((c) => ({
        uniqueId: c.unique_id ?? "",
        isLive: c.is_live ?? false,
        roomId: c.room_id ?? null,
        title: c.title ?? null,
        viewerCount: c.user_count ?? null,
      }));
      res.json(results);
      return;
    }

    // Sandbox fallback: parallel individual live_status calls
    req.log.info("bulk_live_check unavailable, falling back to parallel live_status calls");
    const results = await Promise.all(
      uniqueIds.map(async (uid) => {
        try {
          const r = await fetch(
            `${TIKTOOLS_API}/webcast/live_status?apiKey=${apiKey}&unique_id=${encodeURIComponent(uid)}`
          );
          const json = await r.json() as { data?: { is_live?: boolean; room_id?: string } };
          return {
            uniqueId: uid,
            isLive: json.data?.is_live ?? false,
            roomId: json.data?.room_id ?? null,
            title: null,
            viewerCount: null,
          };
        } catch {
          return { uniqueId: uid, isLive: false, roomId: null, title: null, viewerCount: null };
        }
      })
    );
    res.json(results);
  } catch (err) {
    req.log.error({ err }, "Failed to bulk check");
    res.status(500).json({ error: "Failed to bulk check" });
  }
});

// ── Rate Limits ───────────────────────────────────────────────────────────────
router.get("/tiktok/rate-limits", requireAuth, async (req, res): Promise<void> => {
  try {
    const apiKey = getApiKey();
    const r = await fetch(`${TIKTOOLS_API}/webcast/rate_limits?apiKey=${apiKey}`);
    const json = await r.json() as {
      data?: {
        tier?: string;
        api?: { limit?: number; remaining?: number; reset_at?: number };
        websocket?: { limit?: number; current?: number };
        bulk_check_limit?: number;
      };
    };
    const data = json.data ?? {};
    res.json({
      tier: data.tier ?? "unknown",
      apiLimit: data.api?.limit ?? 0,
      apiRemaining: data.api?.remaining ?? 0,
      apiResetAt: data.api?.reset_at ?? null,
      wsLimit: data.websocket?.limit ?? 0,
      wsCurrent: data.websocket?.current ?? 0,
      bulkCheckLimit: data.bulk_check_limit ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch rate limits");
    res.status(500).json({ error: "Failed to fetch rate limits" });
  }
});

// ── Gift Catalog ──────────────────────────────────────────────────────────────
router.get("/tiktok/gift-catalog", async (req, res): Promise<void> => {
  try {
    const now = Date.now();

    // Populate raw API cache if stale
    if (!rawApiGiftCache || now - rawApiGiftCache.ts >= GIFT_CACHE_TTL) {
      let rawGifts: RawGift[] = [];
      try {
        const apiKey = getApiKey();
        const r = await fetch(`${TIKTOOLS_API}/webcast/gift_info?apiKey=${apiKey}`);
        const json = await r.json() as {
          status_code?: number;
          data?: {
            gifts?: Array<{
              id?: string;
              name?: string;
              icon_url?: string;
              diamond_count?: number;
              value_usd?: number;
            }>;
          };
        };
        rawGifts = (json.data?.gifts ?? []).map((g, idx) => ({
          id: g.id ?? "",
          name: g.name ?? "Unknown Gift",
          iconUrl: g.icon_url ?? "",
          diamondCount: g.diamond_count ?? 0,
          rank: idx,
        }));
      } catch (apiErr) {
        req.log.warn({ err: apiErr }, "tik.tools gift_info unavailable, using static fallback");
      }

      if (rawGifts.length === 0) {
        // Static fallback — already has rank fields
        rawGifts = loadStaticGifts().map((g, idx) => ({
          ...g,
          rank: g.rank ?? idx,
        }));
      }
      rawApiGiftCache = { data: rawGifts, ts: now };
    }

    // Always apply fresh settings and custom gifts — so admin changes reflect immediately
    const settings = loadGiftSettings();
    const gifts = buildGiftList(rawApiGiftCache.data, settings.brlPerUsd);
    res.json(gifts);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch gift catalog");
    try {
      const settings = loadGiftSettings();
      const staticBase = loadStaticGifts().map((g, idx) => ({ ...g, rank: g.rank ?? idx }));
      res.json(buildGiftList(staticBase, settings.brlPerUsd));
    } catch {
      res.status(500).json({ error: "Failed to fetch gift catalog" });
    }
  }
});

// ── User Profile ──────────────────────────────────────────────────────────────
router.get("/tiktok/user-profile", requireAuth, async (req, res): Promise<void> => {
  const parsed = GetUserProfileQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const apiKey = getApiKey();
    const r = await fetch(
      `${TIKTOOLS_API}/webcast/user_profile?apiKey=${apiKey}&unique_id=${encodeURIComponent(parsed.data.uniqueId)}`
    );
    const json = await r.json() as {
      status_code?: number;
      required_tier?: string;
      data?: {
        unique_id?: string;
        nickname?: string;
        avatar_thumb?: { url_list?: string[] };
        follower_count?: number;
        following_count?: number;
        video_count?: number;
        total_favorited?: number;
        signature?: string;
      };
    };

    // Tier error — return gracefully with available: false
    if (json.status_code !== 0) {
      res.json({
        uniqueId: parsed.data.uniqueId,
        nickname: null,
        profilePictureUrl: null,
        followerCount: null,
        followingCount: null,
        videoCount: null,
        likeCount: null,
        bio: null,
        available: false,
        requiredTier: json.required_tier ?? "pro",
      });
      return;
    }

    const d = json.data ?? {};
    res.json({
      uniqueId: d.unique_id ?? parsed.data.uniqueId,
      nickname: d.nickname ?? null,
      profilePictureUrl: d.avatar_thumb?.url_list?.[0] ?? null,
      followerCount: d.follower_count ?? null,
      followingCount: d.following_count ?? null,
      videoCount: d.video_count ?? null,
      likeCount: d.total_favorited ?? null,
      bio: d.signature ?? null,
      available: true,
      requiredTier: null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch user profile");
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// ── Sign URL ──────────────────────────────────────────────────────────────────
router.post("/tiktok/sign-url", requireAuth, async (req, res): Promise<void> => {
  const { url: rawUrl } = req.body as { url?: string };
  if (!rawUrl || typeof rawUrl !== "string") {
    res.status(400).json({ error: "url (string) is required in body" });
    return;
  }
  try {
    const apiKey = getApiKey();
    const r = await fetch(`${TIKTOOLS_API}/webcast/sign_url?apiKey=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: rawUrl }),
    });
    const json = await r.json() as {
      status_code?: number;
      required_tier?: string;
      data?: {
        signed_url?: string;
        x_bogus?: string;
        x_gnarly?: string;
        user_agent?: string;
        cookies?: string;
      };
    };

    if (json.status_code !== 0) {
      res.status(402).json({
        error: "Tier requirement not met",
        requiredTier: json.required_tier ?? "pro",
        available: false,
      });
      return;
    }

    const d = json.data ?? {};
    res.json({
      signedUrl: d.signed_url ?? null,
      xBogus: d.x_bogus ?? null,
      xGnarly: d.x_gnarly ?? null,
      userAgent: d.user_agent ?? null,
      cookies: d.cookies ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to sign URL");
    res.status(500).json({ error: "Failed to sign URL" });
  }
});

// ── Gaming Ranklist (Global Agency unmasked, others masked preview) ────────────
router.get("/tiktok/ranklist/gaming", requireAuth, async (req, res): Promise<void> => {
  const { region } = req.query as { region?: string };
  try {
    const apiKey = getApiKey();
    const params = new URLSearchParams({ apiKey });
    if (region) params.set("region", region);
    const r = await fetch(`${TIKTOOLS_API}/webcast/ranklist/gaming?${params}`);
    const json = await r.json();
    res.json(json);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch gaming ranklist");
    res.status(500).json({ error: "Failed to fetch gaming ranklist" });
  }
});

// ── Gaming Movers (Global Agency — who entered/left the Top 99) ────────────────
router.get("/tiktok/ranklist/gaming-movers", requireAuth, async (req, res): Promise<void> => {
  const { region } = req.query as { region?: string };
  try {
    const apiKey = getApiKey();
    const params = new URLSearchParams({ apiKey });
    if (region) params.set("region", region);
    const r = await fetch(`${TIKTOOLS_API}/webcast/ranklist/gaming_movers?${params}`);
    const json = await r.json();
    res.json(json);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch gaming movers");
    res.status(500).json({ error: "Failed to fetch gaming movers" });
  }
});

// ── Region Movers (Global Agency) ─────────────────────────────────────────────
router.get("/tiktok/ranklist/region-movers", requireAuth, async (req, res): Promise<void> => {
  const { region } = req.query as { region?: string };
  try {
    const apiKey = getApiKey();
    const params = new URLSearchParams({ apiKey });
    if (region) params.set("region", region);
    const r = await fetch(`${TIKTOOLS_API}/webcast/ranklist/region_movers?${params}`);
    const json = await r.json();
    res.json(json);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch region movers");
    res.status(500).json({ error: "Failed to fetch region movers" });
  }
});

// ── Regional Ranklist (PRO+ — sign-and-return pattern) ────────────────────────
router.post("/tiktok/ranklist/regional", requireAuth, async (req, res): Promise<void> => {
  try {
    const apiKey = getApiKey();
    const r = await fetch(`${TIKTOOLS_API}/webcast/ranklist/regional?apiKey=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const json = await r.json();
    res.json(json);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch regional ranklist");
    res.status(500).json({ error: "Failed to fetch regional ranklist" });
  }
});

// ── All 18 League Brackets for a Region ──────────────────────────────────────
router.get("/tiktok/leaderboard/leagues", requireAuth, async (req, res): Promise<void> => {
  const { region } = req.query as { region?: string };
  if (!region) {
    res.status(400).json({ error: "region query param required" });
    return;
  }
  try {
    const apiKey = getApiKey();
    const r = await fetch(
      `${TIKTOOLS_API}/webcast/leaderboard/leagues?region=${encodeURIComponent(region)}&apiKey=${apiKey}`
    );
    const json = await r.json();
    res.json(json);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch league brackets");
    res.status(500).json({ error: "Failed to fetch league brackets" });
  }
});

// ── Single League Bracket ─────────────────────────────────────────────────────
router.get("/tiktok/leaderboard/league", requireAuth, async (req, res): Promise<void> => {
  const { region, class: classType } = req.query as { region?: string; class?: string };
  if (!region || !classType) {
    res.status(400).json({ error: "region and class query params required" });
    return;
  }
  try {
    const apiKey = getApiKey();
    const r = await fetch(
      `${TIKTOOLS_API}/webcast/leaderboard/league?region=${encodeURIComponent(region)}&class=${encodeURIComponent(classType)}&apiKey=${apiKey}`
    );
    const json = await r.json();
    res.json(json);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch league bracket");
    res.status(500).json({ error: "Failed to fetch league bracket" });
  }
});

// ── Live Counts (global + per-region live creator counts) ─────────────────────
router.get("/tiktok/live-counts", requireAuth, async (req, res): Promise<void> => {
  try {
    const apiKey = getApiKey();
    const r = await fetch(`${TIKTOOLS_API}/webcast/live-counts?apiKey=${apiKey}`);
    const json = await r.json();
    res.json(json);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch live counts");
    res.status(500).json({ error: "Failed to fetch live counts" });
  }
});

// ── Country Leaderboard ───────────────────────────────────────────────────────
router.get("/tiktok/leaderboards/country/:slug", requireAuth, async (req, res): Promise<void> => {
  const slug = String(req.params.slug);
  try {
    const apiKey = getApiKey();
    const r = await fetch(
      `${TIKTOOLS_API}/api/leaderboards/country/${encodeURIComponent(slug)}?apiKey=${apiKey}`
    );
    const json = await r.json();
    res.json(json);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch country leaderboard");
    res.status(500).json({ error: "Failed to fetch country leaderboard" });
  }
});

// ── Leaderboards: Legacy League List ─────────────────────────────────────────
router.get("/tiktok/leaderboards/leagues/:region", requireAuth, async (req, res): Promise<void> => {
  const region = String(req.params.region);
  if (!region) {
    res.status(400).json({ error: "region param is required" });
    return;
  }
  try {
    const apiKey = getApiKey();
    const r = await fetch(
      `${TIKTOOLS_API}/api/leaderboards/leagues/${encodeURIComponent(region)}?apiKey=${apiKey}`
    );
    const json = await r.json() as {
      status_code?: number;
      required_tier?: string;
      region?: string;
      available?: boolean;
      leagues?: Array<{ classType?: number; classLabel?: string }>;
    };

    if (json.status_code !== undefined && json.status_code !== 0) {
      res.status(402).json({
        error: "Tier requirement not met",
        requiredTier: json.required_tier ?? "ultra",
        available: false,
      });
      return;
    }

    res.json({
      region: json.region ?? region,
      available: json.available ?? true,
      leagues: (json.leagues ?? []).map((l) => ({
        classType: l.classType ?? 0,
        classLabel: l.classLabel ?? "",
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch leaderboard leagues");
    res.status(500).json({ error: "Failed to fetch leaderboard leagues" });
  }
});

// ── Leaderboards: Legacy League Entries ───────────────────────────────────────
router.get("/tiktok/leaderboards/league/:region/:classType", requireAuth, async (req, res): Promise<void> => {
  const region = String(req.params.region);
  const classType = String(req.params.classType);
  const classTypeNum = parseInt(classType, 10);
  if (!region || isNaN(classTypeNum)) {
    res.status(400).json({ error: "region and classType params are required" });
    return;
  }
  try {
    const apiKey = getApiKey();
    const r = await fetch(
      `${TIKTOOLS_API}/api/leaderboards/league/${encodeURIComponent(region)}/${classTypeNum}?apiKey=${apiKey}`
    );
    const json = await r.json() as {
      status_code?: number;
      required_tier?: string;
      region?: string;
      classType?: number;
      classLabel?: string;
      entries?: Array<{
        rank?: number;
        score?: number;
        uniqueId?: string;
        nickname?: string;
        avatarUrl?: string;
        isLive?: boolean;
        roomId?: string;
      }>;
      teaser?: boolean;
    };

    if (json.status_code !== undefined && json.status_code !== 0) {
      res.status(402).json({
        error: "Tier requirement not met",
        requiredTier: json.required_tier ?? "ultra",
        available: false,
      });
      return;
    }

    res.json({
      region: json.region ?? region,
      classType: json.classType ?? classTypeNum,
      classLabel: json.classLabel ?? "",
      teaser: json.teaser ?? false,
      entries: (json.entries ?? []).map((e) => ({
        rank: e.rank ?? 0,
        score: e.score ?? 0,
        uniqueId: e.uniqueId ?? "",
        nickname: e.nickname ?? null,
        avatarUrl: e.avatarUrl ?? null,
        isLive: e.isLive ?? false,
        roomId: e.roomId ?? null,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch leaderboard league");
    res.status(500).json({ error: "Failed to fetch leaderboard league" });
  }
});

// ── Gifters Leaderboard (cross-creator whale leaderboard) ─────────────────────
router.get("/tiktok/gifters/leaderboard", requireAuth, async (req, res): Promise<void> => {
  const { region, period, limit } = req.query as { region?: string; period?: string; limit?: string };
  try {
    const apiKey = getApiKey();
    const params = new URLSearchParams({ apiKey });
    if (region) params.set("region", region);
    if (period) params.set("period", period);
    if (limit) params.set("limit", limit);
    const r = await fetch(`${TIKTOOLS_API}/api/gifters/leaderboard?${params}`);
    const json = await r.json();
    res.json(json);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch gifters leaderboard");
    res.status(500).json({ error: "Failed to fetch gifters leaderboard" });
  }
});

// ── Top Gifters for a Creator ─────────────────────────────────────────────────
router.get("/tiktok/gifters/top", requireAuth, async (req, res): Promise<void> => {
  const { creator, limit } = req.query as { creator?: string; limit?: string };
  if (!creator) {
    res.status(400).json({ error: "creator query param required" });
    return;
  }
  try {
    const apiKey = getApiKey();
    const params = new URLSearchParams({ apiKey, creator });
    if (limit) params.set("limit", limit);
    const r = await fetch(`${TIKTOOLS_API}/api/gifters/top?${params}`);
    const json = await r.json();
    res.json(json);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch top gifters");
    res.status(500).json({ error: "Failed to fetch top gifters" });
  }
});

// ── Gifter Profile ────────────────────────────────────────────────────────────
router.get("/tiktok/gifters/profile", requireAuth, async (req, res): Promise<void> => {
  const { username } = req.query as { username?: string };
  if (!username) {
    res.status(400).json({ error: "username query param required" });
    return;
  }
  try {
    const apiKey = getApiKey();
    const r = await fetch(
      `${TIKTOOLS_API}/api/gifters/profile?apiKey=${apiKey}&username=${encodeURIComponent(username)}`
    );
    const json = await r.json();
    res.json(json);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch gifter profile");
    res.status(500).json({ error: "Failed to fetch gifter profile" });
  }
});

// ── Live Analytics: Video List ────────────────────────────────────────────────
router.get("/tiktok/live-analytics/video-list", requireAuth, async (req, res): Promise<void> => {
  const { unique_id, count } = req.query as { unique_id?: string; count?: string };
  const cookieHeader = req.headers["x-tiktok-cookie"] as string | undefined;
  if (!unique_id) {
    res.status(400).json({ error: "unique_id query param required" });
    return;
  }
  try {
    const apiKey = getApiKey();
    const params = new URLSearchParams({ apiKey, unique_id });
    if (count) params.set("count", count);
    const headers: Record<string, string> = {};
    if (cookieHeader) headers["x-cookie-header"] = cookieHeader;
    const r = await fetch(`${TIKTOOLS_API}/webcast/live_analytics/video_list?${params}`, { headers });
    const json = await r.json();
    res.json(json);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch video list");
    res.status(500).json({ error: "Failed to fetch video list" });
  }
});

// ── Live Analytics: Video Detail ──────────────────────────────────────────────
router.get("/tiktok/live-analytics/video-detail", requireAuth, async (req, res): Promise<void> => {
  const { video_id } = req.query as { video_id?: string };
  const cookieHeader = req.headers["x-tiktok-cookie"] as string | undefined;
  if (!video_id) {
    res.status(400).json({ error: "video_id query param required" });
    return;
  }
  try {
    const apiKey = getApiKey();
    const headers: Record<string, string> = {};
    if (cookieHeader) headers["x-cookie-header"] = cookieHeader;
    const r = await fetch(
      `${TIKTOOLS_API}/webcast/live_analytics/video_detail?apiKey=${apiKey}&video_id=${encodeURIComponent(video_id)}`,
      { headers }
    );
    const json = await r.json();
    res.json(json);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch video detail");
    res.status(500).json({ error: "Failed to fetch video detail" });
  }
});

// ── Live Analytics: User Interactions (top gifters in live session) ────────────
router.get("/tiktok/live-analytics/user-interactions", requireAuth, async (req, res): Promise<void> => {
  const { room_id, count } = req.query as { room_id?: string; count?: string };
  const cookieHeader = req.headers["x-tiktok-cookie"] as string | undefined;
  if (!room_id) {
    res.status(400).json({ error: "room_id query param required" });
    return;
  }
  try {
    const apiKey = getApiKey();
    const params = new URLSearchParams({ apiKey, room_id });
    if (count) params.set("count", count);
    const headers: Record<string, string> = {};
    if (cookieHeader) headers["x-cookie-header"] = cookieHeader;
    const r = await fetch(`${TIKTOOLS_API}/webcast/live_analytics/user_interactions?${params}`, { headers });
    const json = await r.json();
    res.json(json);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch user interactions");
    res.status(500).json({ error: "Failed to fetch user interactions" });
  }
});

// ── Webhooks: List ────────────────────────────────────────────────────────────
router.get("/tiktok/webhooks", requireAuth, async (req, res): Promise<void> => {
  try {
    const apiKey = getApiKey();
    const r = await fetch(`${TIKTOOLS_API}/api/webhooks?apiKey=${apiKey}`);
    const json = await r.json();
    res.json(json);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch webhooks");
    res.status(500).json({ error: "Failed to fetch webhooks" });
  }
});

// ── Webhooks: Create ──────────────────────────────────────────────────────────
router.post("/tiktok/webhooks", requireAuth, async (req, res): Promise<void> => {
  try {
    const apiKey = getApiKey();
    const r = await fetch(`${TIKTOOLS_API}/api/webhooks?apiKey=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const json = await r.json();
    res.json(json);
  } catch (err) {
    req.log.error({ err }, "Failed to create webhook");
    res.status(500).json({ error: "Failed to create webhook" });
  }
});

// ── Webhooks: Delete ──────────────────────────────────────────────────────────
router.delete("/tiktok/webhooks/:id", requireAuth, async (req, res): Promise<void> => {
  const id = String(req.params.id);
  try {
    const apiKey = getApiKey();
    const r = await fetch(`${TIKTOOLS_API}/api/webhooks/${encodeURIComponent(id)}?apiKey=${apiKey}`, {
      method: "DELETE",
    });
    const json = await r.json();
    res.json(json);
  } catch (err) {
    req.log.error({ err }, "Failed to delete webhook");
    res.status(500).json({ error: "Failed to delete webhook" });
  }
});

// ── Webhooks: Test delivery ───────────────────────────────────────────────────
router.post("/tiktok/webhooks/:id/test", requireAuth, async (req, res): Promise<void> => {
  const id = String(req.params.id);
  try {
    const apiKey = getApiKey();
    const r = await fetch(`${TIKTOOLS_API}/api/webhooks/${encodeURIComponent(id)}/test?apiKey=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body ?? {}),
    });
    const json = await r.json();
    res.json(json);
  } catch (err) {
    req.log.error({ err }, "Failed to test webhook");
    res.status(500).json({ error: "Failed to test webhook" });
  }
});

export default router;
