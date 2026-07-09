import { Router, type IRouter } from "express";
import fs from "fs";
import path from "path";
import { requireAdminMiddleware } from "./auth";

const router: IRouter = Router();

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();
const dataDir = path.resolve(workspaceRoot, "artifacts/api-server/data");
const configFile = path.resolve(dataDir, "auth-config.json");

interface AuthConfig {
  // Stack Auth (Neon)
  stackProjectId?: string;
  stackPublishableClientKey?: string;
  stackSecretServerKey?: string;
  // Social login toggles
  googleEnabled?: boolean;
  googleClientId?: string;
  googleClientSecret?: string;
  tiktokEnabled?: boolean;
  tiktokClientKey?: string;
  tiktokClientSecret?: string;
  tiktokRedirectUri?: string;
  // Verification
  emailVerificationRequired?: boolean;
  smsVerificationRequired?: boolean;
  // General
  allowSignup?: boolean;
  autoApproveNewUsers?: boolean;
  sessionDurationDays?: number;
}

const DEFAULTS: AuthConfig = {
  googleEnabled: false,
  tiktokEnabled: false,
  emailVerificationRequired: true,
  smsVerificationRequired: false,
  allowSignup: true,
  autoApproveNewUsers: true,
  sessionDurationDays: 30,
};

function loadConfig(): AuthConfig {
  try {
    if (fs.existsSync(configFile)) return { ...DEFAULTS, ...(JSON.parse(fs.readFileSync(configFile, "utf-8")) as AuthConfig) };
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

function saveConfig(cfg: AuthConfig): void {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(configFile, JSON.stringify(cfg, null, 2));
}

function mask(v?: string): string | null {
  if (!v) return null;
  if (v.length <= 8) return "***";
  return v.slice(0, 4) + "..." + v.slice(-4);
}

// GET public config (safe fields — for frontend to know which providers are enabled)
router.get("/auth-config/public", (_req, res): void => {
  const c = loadConfig();
  res.json({
    googleEnabled: !!c.googleEnabled && !!c.googleClientId,
    tiktokEnabled: !!c.tiktokEnabled && !!c.tiktokClientKey,
    emailVerificationRequired: !!c.emailVerificationRequired,
    allowSignup: c.allowSignup !== false,
    stackAuthConfigured: !!(c.stackProjectId && c.stackPublishableClientKey),
  });
});

// GET admin full config (secrets masked)
router.get("/admin/auth-config", requireAdminMiddleware, (_req, res): void => {
  const c = loadConfig();
  res.json({
    stackProjectId: c.stackProjectId ?? "",
    stackPublishableClientKey: c.stackPublishableClientKey ?? "",
    stackSecretServerKeyMasked: mask(c.stackSecretServerKey),
    stackSecretServerKeySet: !!c.stackSecretServerKey,
    googleEnabled: !!c.googleEnabled,
    googleClientId: c.googleClientId ?? "",
    googleClientSecretMasked: mask(c.googleClientSecret),
    googleClientSecretSet: !!c.googleClientSecret,
    tiktokEnabled: !!c.tiktokEnabled,
    tiktokClientKey: c.tiktokClientKey ?? "",
    tiktokClientSecretMasked: mask(c.tiktokClientSecret),
    tiktokClientSecretSet: !!c.tiktokClientSecret,
    tiktokRedirectUri: c.tiktokRedirectUri ?? "",
    emailVerificationRequired: c.emailVerificationRequired !== false,
    smsVerificationRequired: !!c.smsVerificationRequired,
    allowSignup: c.allowSignup !== false,
    autoApproveNewUsers: c.autoApproveNewUsers !== false,
    sessionDurationDays: c.sessionDurationDays ?? 30,
  });
});

// PATCH admin config — accepts partial updates
router.patch("/admin/auth-config", requireAdminMiddleware, (req, res): void => {
  const c = loadConfig();
  const body = req.body as Partial<AuthConfig & { clearGoogleClientSecret?: boolean; clearTiktokClientSecret?: boolean; clearStackSecretServerKey?: boolean }>;

  // Update simple fields (empty string ok = keep, undefined = ignore, blank overwrite via clear flags)
  const setIfDefined = <K extends keyof AuthConfig>(k: K, v: AuthConfig[K] | undefined): void => {
    if (v !== undefined) c[k] = v;
  };

  setIfDefined("stackProjectId", body.stackProjectId?.trim());
  setIfDefined("stackPublishableClientKey", body.stackPublishableClientKey?.trim());
  if (body.stackSecretServerKey && body.stackSecretServerKey.trim()) c.stackSecretServerKey = body.stackSecretServerKey.trim();
  if (body.clearStackSecretServerKey) c.stackSecretServerKey = "";

  setIfDefined("googleEnabled", body.googleEnabled);
  setIfDefined("googleClientId", body.googleClientId?.trim());
  if (body.googleClientSecret && body.googleClientSecret.trim()) c.googleClientSecret = body.googleClientSecret.trim();
  if (body.clearGoogleClientSecret) c.googleClientSecret = "";

  setIfDefined("tiktokEnabled", body.tiktokEnabled);
  setIfDefined("tiktokClientKey", body.tiktokClientKey?.trim());
  if (body.tiktokClientSecret && body.tiktokClientSecret.trim()) c.tiktokClientSecret = body.tiktokClientSecret.trim();
  if (body.clearTiktokClientSecret) c.tiktokClientSecret = "";
  setIfDefined("tiktokRedirectUri", body.tiktokRedirectUri?.trim());

  setIfDefined("emailVerificationRequired", body.emailVerificationRequired);
  setIfDefined("smsVerificationRequired", body.smsVerificationRequired);
  setIfDefined("allowSignup", body.allowSignup);
  setIfDefined("autoApproveNewUsers", body.autoApproveNewUsers);
  if (typeof body.sessionDurationDays === "number" && body.sessionDurationDays > 0) c.sessionDurationDays = body.sessionDurationDays;

  saveConfig(c);
  res.json({ ok: true, message: "Configuração salva. Reinicie o backend para aplicar mudanças que afetam sessões." });
});

// Test Stack Auth connection
router.post("/admin/auth-config/test-stack", requireAdminMiddleware, async (_req, res): Promise<void> => {
  const c = loadConfig();
  if (!c.stackProjectId || !c.stackPublishableClientKey) {
    res.json({ ok: false, message: "Configure STACK_PROJECT_ID e STACK_PUBLISHABLE_CLIENT_KEY primeiro" });
    return;
  }
  try {
    // Stack Auth publishable endpoint
    const r = await fetch(`https://api.stack-auth.com/api/v1/projects/${c.stackProjectId}/svix-token`, {
      method: "GET",
      headers: {
        "x-stack-access-type": "client",
        "x-stack-project-id": c.stackProjectId,
        "x-stack-publishable-client-key": c.stackPublishableClientKey,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (r.status === 401 || r.status === 403) {
      res.json({ ok: false, message: `Chaves inválidas (HTTP ${r.status})` });
      return;
    }
    res.json({ ok: true, message: `Conectado ao Stack Auth (HTTP ${r.status})` });
  } catch (err) {
    res.json({ ok: false, message: err instanceof Error ? err.message : "Erro de conexão" });
  }
});

export default router;
