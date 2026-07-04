import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  getAllUsers, getUserById, getUserByEmail, getUserByTiktokUsername,
  getUserByTiktokOAuthId, countUsers, createUser, updateUser, deleteUserById,
  emailConflictExists, tiktokUsernameConflictExists, publicUser, makeId,
  type StoredUser, type InsertStoredUser,
} from "../lib/users-store";

export type { StoredUser };

const router: IRouter = Router();

const DEFAULT_JWT_SECRET = "creatools-secret-change-in-production";
if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET environment variable must be set in production");
}
const JWT_SECRET = process.env.JWT_SECRET ?? DEFAULT_JWT_SECRET;
const SALT_ROUNDS = 10;

// ── Auth middleware ────────────────────────────────────────────────────────────
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return; }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    (req as Request & { userId: string }).userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export async function requireAdminMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return; }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await getUserById(payload.userId);
    if (!user?.isAdmin) { res.status(403).json({ error: "Admin access required" }); return; }
    (req as Request & { userId: string }).userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

function signToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

// ── Register ──────────────────────────────────────────────────────────────────
router.post("/auth/register", async (req, res): Promise<void> => {
  const { email, password, name, tiktokUsername, tiktokProfilePicture, tiktokDisplayName, tiktokFollowerCount } =
    req.body as {
      email?: string; password?: string; name?: string;
      tiktokUsername?: string; tiktokProfilePicture?: string;
      tiktokDisplayName?: string; tiktokFollowerCount?: number;
    };

  if (!email || !password || !name) {
    res.status(400).json({ error: "Email, senha e nome são obrigatórios" }); return;
  }
  if (!tiktokUsername?.trim()) {
    res.status(400).json({ error: "O @ do TikTok é obrigatório para criar sua conta" }); return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres" }); return;
  }

  const existing = await getUserByEmail(email);
  if (existing) { res.status(409).json({ error: "E-mail já cadastrado" }); return; }

  const handle = tiktokUsername.trim().replace(/^@/, "");
  if (!handle) { res.status(400).json({ error: "O @ do TikTok é obrigatório" }); return; }

  const tiktokConflict = await getUserByTiktokUsername(handle);
  if (tiktokConflict) { res.status(409).json({ error: "Este usuário do TikTok já está vinculado a outra conta" }); return; }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const isFirst = (await countUsers()) === 0;
  const now = new Date().toISOString();

  const user = await createUser({
    id: makeId(),
    email: email.toLowerCase().trim(),
    name: name.trim(),
    passwordHash,
    createdAt: now,
    lastLoginAt: now,
    plan: "free",
    isAdmin: isFirst,
    tiktokUsername: handle || undefined,
    tiktokVerified: true,
    tiktokProfilePicture: tiktokProfilePicture ?? undefined,
    tiktokDisplayName: tiktokDisplayName ?? undefined,
    tiktokFollowerCount: tiktokFollowerCount ?? undefined,
    tiktokLinkedAt: now,
  });

  const token = signToken(user.id);
  req.log.info({ userId: user.id, isAdmin: user.isAdmin }, "User registered");
  res.status(201).json({ token, user: publicUser(user) });
});

// ── Login ─────────────────────────────────────────────────────────────────────
router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: "email e password são obrigatórios" }); return;
  }

  const user = await getUserByEmail(email);
  if (!user) { res.status(401).json({ error: "E-mail ou senha inválidos" }); return; }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) { res.status(401).json({ error: "E-mail ou senha inválidos" }); return; }

  await updateUser(user.id, { lastLoginAt: new Date().toISOString() });

  const token = signToken(user.id);
  req.log.info({ userId: user.id }, "User logged in");
  res.json({ token, user: publicUser({ ...user, lastLoginAt: new Date().toISOString() }) });
});

// ── Me ────────────────────────────────────────────────────────────────────────
router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const user = await getUserById(userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ user: publicUser(user) });
});

// ── Update profile ────────────────────────────────────────────────────────────
router.patch("/auth/profile", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const { name, email, tiktokUsername } = req.body as { name?: string; email?: string; tiktokUsername?: string };

  const user = await getUserById(userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const updates: Partial<InsertStoredUser> = {};

  if (email) {
    if (await emailConflictExists(email, userId)) { res.status(409).json({ error: "E-mail já em uso" }); return; }
    updates.email = email.toLowerCase().trim();
  }
  if (name) updates.name = name.trim();

  if (tiktokUsername !== undefined) {
    const newHandle = tiktokUsername.trim().replace(/^@/, "") || undefined;
    const currentHandle = user.tiktokUsername;

    if (newHandle !== currentHandle) {
      if (newHandle && await tiktokUsernameConflictExists(newHandle, userId)) {
        res.status(409).json({ error: "Este usuário do TikTok já está vinculado a outra conta" }); return;
      }

      try {
        const { getPlanById } = await import("../lib/plans-store");
        const plan = await getPlanById(user.plan);
        if (plan) {
          const limit = plan.tiktokUsernameChangesPerWeek;
          if (limit === 0) {
            res.status(403).json({ error: "Seu plano não permite alterar o username do TikTok." }); return;
          }
          if (limit > 0) {
            const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            const log = user.tiktokUsernameChangeLog ?? [];
            const changesThisWeek = log.filter((ts) => new Date(ts).getTime() > weekAgo).length;
            if (changesThisWeek >= limit) {
              res.status(429).json({ error: `Limite de ${limit} alteração(ões) por semana atingido.`, changesThisWeek, limit, requiresRequest: true }); return;
            }
          }
        }
      } catch { /* if plans store fails, allow */ }

      const log = [...(user.tiktokUsernameChangeLog ?? []), new Date().toISOString()];
      updates.tiktokUsernameChangeLog = log;
    }
    updates.tiktokUsername = newHandle;
  }

  const updated = await updateUser(userId, updates);
  req.log.info({ userId }, "Profile updated");
  res.json({ user: publicUser(updated ?? user) });
});

// ── Change password ───────────────────────────────────────────────────────────
router.patch("/auth/password", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword e newPassword são obrigatórios" }); return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "A nova senha deve ter pelo menos 6 caracteres" }); return;
  }

  const user = await getUserById(userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) { res.status(401).json({ error: "Senha atual incorreta" }); return; }

  await updateUser(userId, { passwordHash: await bcrypt.hash(newPassword, SALT_ROUNDS) });
  req.log.info({ userId }, "Password changed");
  res.json({ ok: true });
});

// ── Logout ────────────────────────────────────────────────────────────────────
router.post("/auth/logout", (_req, res): void => { res.json({ ok: true }); });

// ── TikTok OAuth: get authorization URL ───────────────────────────────────────
router.get("/auth/tiktok/url", (req, res): void => {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) {
    res.status(503).json({ error: "TikTok OAuth não configurado." }); return;
  }
  const redirectUri = process.env.TIKTOK_REDIRECT_URI ?? `${req.protocol}://${req.get("host")}/api/auth/tiktok/callback`;
  const state = Math.random().toString(36).slice(2);
  const params = new URLSearchParams({ client_key: clientKey, scope: "user.info.basic,user.info.profile", response_type: "code", redirect_uri: redirectUri, state });
  res.json({ url: `https://www.tiktok.com/auth/authorize/?${params.toString()}`, state });
});

// ── TikTok OAuth: callback ─────────────────────────────────────────────────────
router.get("/auth/tiktok/callback", async (req, res): Promise<void> => {
  const { code, error: oauthError } = req.query as { code?: string; error?: string };
  const frontendBase = process.env.FRONTEND_URL ?? "";

  if (oauthError || !code) { res.redirect(`${frontendBase}/login?error=tiktok_denied`); return; }

  try {
    const clientKey = process.env.TIKTOK_CLIENT_KEY!;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET!;
    const redirectUri = process.env.TIKTOK_REDIRECT_URI ?? `${req.protocol}://${req.get("host")}/api/auth/tiktok/callback`;

    const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_key: clientKey, client_secret: clientSecret, code, grant_type: "authorization_code", redirect_uri: redirectUri }),
    });
    const tokenData = await tokenRes.json() as { access_token?: string; open_id?: string; refresh_token?: string };
    if (!tokenData.access_token || !tokenData.open_id) {
      res.redirect(`${frontendBase}/login?error=tiktok_token`); return;
    }

    const userRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username,follower_count", { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
    const userData = await userRes.json() as { data?: { user?: { display_name?: string; username?: string; avatar_url?: string; follower_count?: number } } };
    const tiktokUser = userData.data?.user;
    const openId = tokenData.open_id;
    const tiktokUsername = tiktokUser?.username ?? "";
    const displayName = tiktokUser?.display_name ?? "";
    const avatarUrl = tiktokUser?.avatar_url ?? "";
    const followerCount = tiktokUser?.follower_count ?? 0;
    const now = new Date().toISOString();

    let existing = await getUserByTiktokOAuthId(openId);
    if (!existing && tiktokUsername) existing = await getUserByTiktokUsername(tiktokUsername);

    let userId: string;
    if (existing) {
      const u = await updateUser(existing.id, {
        tiktokOAuthId: openId,
        tiktokOAuthAccessToken: tokenData.access_token,
        tiktokOAuthRefreshToken: tokenData.refresh_token ?? undefined,
        tiktokProfilePicture: (avatarUrl || existing.tiktokProfilePicture) ?? undefined,
        tiktokDisplayName: (displayName || existing.tiktokDisplayName) ?? undefined,
        tiktokFollowerCount: followerCount,
        lastLoginAt: now,
        ...(!existing.tiktokUsername && tiktokUsername ? { tiktokUsername, tiktokVerified: true, tiktokLinkedAt: now } : {}),
      });
      userId = (u ?? existing).id;
    } else {
      const isFirst = (await countUsers()) === 0;
      const newUser = await createUser({
        id: makeId(),
        email: `tiktok-${openId}@oauth.creatools`,
        name: displayName || tiktokUsername || "TikTok User",
        passwordHash: "",
        createdAt: now,
        lastLoginAt: now,
        plan: "free",
        isAdmin: isFirst,
        tiktokOAuthId: openId,
        tiktokOAuthAccessToken: tokenData.access_token,
        tiktokOAuthRefreshToken: tokenData.refresh_token ?? undefined,
        tiktokUsername: tiktokUsername || undefined,
        tiktokDisplayName: displayName,
        tiktokProfilePicture: avatarUrl,
        tiktokFollowerCount: followerCount,
        tiktokVerified: true,
        tiktokLinkedAt: now,
      });
      userId = newUser.id;
    }

    res.redirect(`${frontendBase}/login?tiktok_token=${signToken(userId)}`);
  } catch (err) {
    req.log.error({ err }, "TikTok OAuth callback error");
    res.redirect(`${frontendBase}/login?error=tiktok_error`);
  }
});

// ── Admin: list users ─────────────────────────────────────────────────────────
router.get("/auth/users", requireAdminMiddleware, async (_req, res): Promise<void> => {
  const users = await getAllUsers();
  res.json({ users: users.map(publicUser) });
});

// ── Admin: update user ────────────────────────────────────────────────────────
router.patch("/auth/users/:id", requireAdminMiddleware, async (req, res): Promise<void> => {
  const { id } = req.params as { id: string };
  const { plan, isAdmin, name, email, tiktokUsername, newPassword } = req.body as {
    plan?: string; isAdmin?: boolean; name?: string; email?: string; tiktokUsername?: string | null; newPassword?: string;
  };

  const user = await getUserById(id);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const updates: Partial<InsertStoredUser> = {};
  if (plan !== undefined) updates.plan = plan;
  if (isAdmin !== undefined) updates.isAdmin = isAdmin;
  if (name) updates.name = name.trim();
  if (email) {
    if (await emailConflictExists(email, id)) { res.status(409).json({ error: "E-mail já em uso" }); return; }
    updates.email = email.toLowerCase().trim();
  }
  if (tiktokUsername !== undefined) {
    const handle = typeof tiktokUsername === "string" ? tiktokUsername.trim().replace(/^@/, "") || undefined : undefined;
    if (handle && await tiktokUsernameConflictExists(handle, id)) {
      res.status(409).json({ error: "Este @ do TikTok já está vinculado a outra conta" }); return;
    }
    updates.tiktokUsername = handle;
  }
  if (newPassword) {
    if (newPassword.length < 6) { res.status(400).json({ error: "Senha mínima de 6 caracteres" }); return; }
    updates.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  }

  const updated = await updateUser(id, updates);
  req.log.info({ adminAction: "update_user", targetId: id }, "Admin updated user");
  res.json({ user: publicUser(updated ?? user) });
});

// ── Admin: delete user ────────────────────────────────────────────────────────
router.delete("/auth/users/:id", requireAdminMiddleware, async (req, res): Promise<void> => {
  const { id } = req.params as { id: string };
  const adminId = (req as Request & { userId: string }).userId;
  if (id === adminId) { res.status(400).json({ error: "Não é possível deletar sua própria conta" }); return; }

  const user = await getUserById(id);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  await deleteUserById(id);
  res.json({ ok: true });
});

export default router;
