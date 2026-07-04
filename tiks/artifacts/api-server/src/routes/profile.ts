import { Router, type Request, type Response as ExpressResponse } from "express";
import fs from "fs";
import path from "path";
import { requireAuth } from "./auth";
import { getUserByTiktokUsername, updateUser, getUserById } from "../lib/users-store";

const router = Router();

const TIKTOOLS_API = "https://api.tik.tools";
const configFile = path.join(process.cwd(), "data", "config.json");

function getApiKey(): string | undefined {
  const key = process.env.TIKTOOLS_API_KEY;
  if (key) return key;
  try {
    const cfg = JSON.parse(fs.readFileSync(configFile, "utf-8")) as { apiKey?: string };
    return cfg.apiKey || undefined;
  } catch {
    return undefined;
  }
}

export interface SocialLinks {
  instagram?: string;
  youtube?: string;
  whatsapp?: string;
  discord?: string;
  custom?: Array<{ label: string; url: string }>;
}

export interface ProfileSections {
  showStats: boolean;
  showLiveStatus: boolean;
  showTopGifts: boolean;
  showTopGifters: boolean;
  showSocialLinks: boolean;
}

export interface TopGifter {
  username: string;
  displayName: string;
  avatar: string | null;
  diamondCount: number;
}

export interface TopGift {
  giftName: string;
  count: number;
  diamondValue: number;
}

const SECTION_DEFAULTS: ProfileSections = {
  showStats: true,
  showLiveStatus: true,
  showTopGifts: true,
  showTopGifters: true,
  showSocialLinks: true,
};

function parseSocialLinks(raw: string | null | undefined): SocialLinks {
  if (!raw) return {};
  try { return JSON.parse(raw) as SocialLinks; } catch { return {}; }
}

function parseProfileSections(raw: string | null | undefined): ProfileSections {
  if (!raw) return { ...SECTION_DEFAULTS };
  try { return { ...SECTION_DEFAULTS, ...JSON.parse(raw) as Partial<ProfileSections> }; } catch { return { ...SECTION_DEFAULTS }; }
}

function publicProfileData(user: Awaited<ReturnType<typeof getUserById>>) {
  if (!user) return null;
  return {
    publicProfileEnabled: user.publicProfileEnabled ?? false,
    profileBio: user.profileBio ?? null,
    profileBanner: user.profileBanner ?? null,
    socialLinks: parseSocialLinks(user.socialLinks),
    profileSections: parseProfileSections(user.profileSections),
  };
}

async function fetchWithTimeout(url: string, opts?: RequestInit, ms = 5000): Promise<globalThis.Response> {
  return fetch(url, { ...opts, signal: AbortSignal.timeout(ms) });
}

// GET /profile — current user's public profile settings (auth required)
router.get("/profile", requireAuth, async (req: Request, res: ExpressResponse): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const user = await getUserById(userId);
  if (!user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
  res.json(publicProfileData(user));
});

// PATCH /profile — update public profile settings (auth required)
router.patch("/profile", requireAuth, async (req: Request, res: ExpressResponse): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const { publicProfileEnabled, profileBio, profileBanner, socialLinks, profileSections } = req.body as {
    publicProfileEnabled?: boolean;
    profileBio?: string;
    profileBanner?: string;
    socialLinks?: SocialLinks;
    profileSections?: Partial<ProfileSections>;
  };

  const updates: Record<string, unknown> = {};
  if (typeof publicProfileEnabled === "boolean") updates.publicProfileEnabled = publicProfileEnabled;
  if (typeof profileBio === "string") updates.profileBio = profileBio.trim().slice(0, 300) || null;
  if (typeof profileBanner === "string") updates.profileBanner = profileBanner.trim() || null;
  if (socialLinks !== undefined) updates.socialLinks = JSON.stringify(socialLinks);
  if (profileSections !== undefined) {
    const current = parseProfileSections(undefined);
    updates.profileSections = JSON.stringify({ ...current, ...profileSections });
  }

  const updated = await updateUser(userId, updates);
  if (!updated) { res.status(404).json({ error: "Usuário não encontrado" }); return; }

  res.json(publicProfileData(updated));
});

// GET /profile/public/:username — public, no auth required
router.get("/profile/public/:username", async (req: Request, res: ExpressResponse): Promise<void> => {
  const username = String(req.params.username);

  let user: Awaited<ReturnType<typeof getUserByTiktokUsername>>;
  try { user = await getUserByTiktokUsername(username); } catch { user = null; }

  if (!user || !user.publicProfileEnabled) {
    res.status(404).json({ error: "Perfil não encontrado ou não está público." });
    return;
  }

  const apiKey = getApiKey();
  const sections = parseProfileSections(user.profileSections);

  // Parallel: live_status + top gifters (best-effort)
  let isLive = false;
  let roomId: string | null = null;
  let viewerCount: number | null = null;
  let likeCount: number | null = null;
  let topGifters: TopGifter[] = [];
  let topGifts: TopGift[] = [];

  if (apiKey) {
    const [liveRes, giftersRes] = await Promise.allSettled([
      fetchWithTimeout(
        `${TIKTOOLS_API}/webcast/live_status?apiKey=${encodeURIComponent(apiKey)}&unique_id=${encodeURIComponent(username)}`
      ),
      sections.showTopGifters
        ? fetchWithTimeout(
            `${TIKTOOLS_API}/api/gifters/top?apiKey=${encodeURIComponent(apiKey)}&creator=${encodeURIComponent(username)}&limit=5`
          )
        : Promise.resolve(null),
    ]);

    // Parse live status
    if (liveRes.status === "fulfilled" && liveRes.value?.ok) {
      try {
        const d = await liveRes.value.json() as { data?: { is_live?: boolean; room_id?: string } };
        isLive = d.data?.is_live ?? false;
        roomId = d.data?.room_id ?? null;
      } catch { /* ignore */ }
    }

    // When live: room_info (viewer/like count) + top gifts in parallel
    if (isLive && roomId) {
      const [roomRes, fetchRes] = await Promise.allSettled([
        sections.showLiveStatus
          ? fetchWithTimeout(`${TIKTOOLS_API}/webcast/room_info?apiKey=${encodeURIComponent(apiKey)}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ room_id: roomId }),
            })
          : Promise.resolve(null),
        sections.showTopGifts
          ? fetchWithTimeout(`${TIKTOOLS_API}/webcast/fetch?apiKey=${encodeURIComponent(apiKey)}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ unique_id: username }),
            })
          : Promise.resolve(null),
      ]);

      // Room info
      if (roomRes.status === "fulfilled" && roomRes.value?.ok) {
        try {
          const d = await roomRes.value.json() as { data?: { user_count?: number; like_count?: number } };
          viewerCount = d.data?.user_count ?? null;
          likeCount = d.data?.like_count ?? null;
        } catch { /* ignore */ }
      }

      // Top gifts (aggregate gift events from current session)
      if (fetchRes.status === "fulfilled" && fetchRes.value?.ok) {
        try {
          const d = await fetchRes.value.json() as {
            data?: {
              events?: Array<{
                event_type?: string;
                type?: string;
                data?: {
                  gift_name?: string; giftName?: string;
                  repeat_count?: number; repeatCount?: number;
                  diamond_count?: number; diamondCount?: number;
                };
              }>;
            };
          };
          const giftMap = new Map<string, { count: number; diamonds: number }>();
          for (const ev of d.data?.events ?? []) {
            if (ev.event_type !== "gift" && ev.type !== "gift") continue;
            const name = ev.data?.gift_name ?? ev.data?.giftName ?? "";
            if (!name) continue;
            const reps = ev.data?.repeat_count ?? ev.data?.repeatCount ?? 1;
            const diamonds = ev.data?.diamond_count ?? ev.data?.diamondCount ?? 0;
            const existing = giftMap.get(name) ?? { count: 0, diamonds: 0 };
            giftMap.set(name, { count: existing.count + reps, diamonds: existing.diamonds + diamonds * reps });
          }
          topGifts = Array.from(giftMap.entries())
            .map(([giftName, v]) => ({ giftName, count: v.count, diamondValue: v.diamonds }))
            .sort((a, b) => b.diamondValue - a.diamondValue)
            .slice(0, 5);
        } catch { /* ignore */ }
      }
    }

    // Parse top gifters
    if (giftersRes.status === "fulfilled" && giftersRes.value?.ok) {
      try {
        const d = await giftersRes.value.json() as {
          data?: Array<{
            username?: string; nickname?: string;
            avatar_thumb?: { url_list?: string[] };
            diamond_count?: number;
          }>;
        };
        topGifters = (d.data ?? []).slice(0, 5).map((g) => ({
          username: g.username ?? "",
          displayName: g.nickname ?? g.username ?? "",
          avatar: g.avatar_thumb?.url_list?.[0] ?? null,
          diamondCount: g.diamond_count ?? 0,
        }));
      } catch { /* ignore */ }
    }
  }

  res.json({
    username: user.tiktokUsername,
    displayName: user.tiktokDisplayName ?? user.tiktokUsername ?? username,
    avatar: user.tiktokProfilePicture ?? null,
    followerCount: sections.showStats ? (user.tiktokFollowerCount ?? null) : null,
    totalLiveSessions: sections.showStats ? (user.totalLiveSessions ?? 0) : null,
    verified: user.tiktokVerified ?? false,
    bio: user.profileBio ?? null,
    banner: user.profileBanner ?? null,
    socialLinks: sections.showSocialLinks ? parseSocialLinks(user.socialLinks) : {},
    isLive: sections.showLiveStatus ? isLive : false,
    viewerCount: sections.showLiveStatus ? viewerCount : null,
    likeCount: sections.showLiveStatus ? likeCount : null,
    topGifters: sections.showTopGifters ? topGifters : [],
    topGifts: sections.showTopGifts ? topGifts : [],
    profileSections: sections,
  });
});

export default router;
