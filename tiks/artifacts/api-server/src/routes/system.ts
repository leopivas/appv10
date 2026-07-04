import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import fs from "fs";
import path from "path";
import os from "os";
import pg from "pg";
import { requireAuth, requireAdminMiddleware } from "./auth";
import { getAllUsers } from "../lib/users-store";

const router: IRouter = Router();

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();
const dataDir = path.resolve(workspaceRoot, "artifacts/api-server/data");
const altApiConfigFile = path.resolve(dataDir, "alt-api-config.json");
const configFile = path.resolve(dataDir, "config.json");

interface AltApiConfig {
  enabled: boolean; provider: "custom" | "tikapi" | "none";
  baseUrl: string; apiKeyHeader: string; apiKey: string;
  testPath: string; notes: string;
}

function loadAltApiConfig(): AltApiConfig {
  try {
    if (fs.existsSync(altApiConfigFile)) return JSON.parse(fs.readFileSync(altApiConfigFile, "utf-8")) as AltApiConfig;
  } catch { /* ignore */ }
  return { enabled: false, provider: "none", baseUrl: "", apiKeyHeader: "x-api-key", apiKey: "", testPath: "/api/live/top-channels", notes: "" };
}

function saveAltApiConfig(cfg: AltApiConfig): void {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(altApiConfigFile, JSON.stringify(cfg, null, 2));
}

function loadConfig(): { apiKey?: string } {
  try {
    if (fs.existsSync(configFile)) return JSON.parse(fs.readFileSync(configFile, "utf-8")) as { apiKey?: string };
  } catch { /* ignore */ }
  return {};
}

function maskKey(key: string): string {
  if (!key || key.length <= 8) return "***";
  return key.slice(0, 6) + "..." + key.slice(-4);
}

router.get("/admin/system-status", requireAdminMiddleware, async (req, res): Promise<void> => {
  const users = await getAllUsers();
  const altCfg = loadAltApiConfig();
  const tiktoolsKey = process.env.TIKTOOLS_API_KEY || loadConfig().apiKey;
  const checks: Record<string, { ok: boolean; message: string; latencyMs?: number }> = {};

  const tiktoolsStart = Date.now();
  try {
    const r = await fetch("https://api.tik.tools/api/live/top-channels", {
      headers: tiktoolsKey ? { "x-api-key": tiktoolsKey } : {},
      signal: AbortSignal.timeout(5000),
    });
    checks.tiktools = { ok: r.ok, message: r.ok ? "Online" : `Status ${r.status}`, latencyMs: Date.now() - tiktoolsStart };
  } catch (err) {
    checks.tiktools = { ok: false, message: err instanceof Error ? err.message : "Erro", latencyMs: Date.now() - tiktoolsStart };
  }

  if (altCfg.enabled && altCfg.baseUrl) {
    const altStart = Date.now();
    try {
      const url = `${altCfg.baseUrl.replace(/\/$/, "")}${altCfg.testPath || "/"}`;
      const headers: Record<string, string> = {};
      if (altCfg.apiKey && altCfg.apiKeyHeader) headers[altCfg.apiKeyHeader] = altCfg.apiKey;
      const r = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
      checks.altApi = { ok: r.ok, message: r.ok ? "Online" : `Status ${r.status}`, latencyMs: Date.now() - altStart };
    } catch (err) {
      checks.altApi = { ok: false, message: err instanceof Error ? err.message : "Erro", latencyMs: Date.now() - altStart };
    }
  } else {
    checks.altApi = { ok: false, message: "Não configurado" };
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey) {
    const stripeStart = Date.now();
    try {
      const Stripe = (await import("stripe")).default;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stripe = new Stripe(stripeKey, { apiVersion: "2026-06-24.dahlia" as any });
      const balance = await stripe.balance.retrieve();
      checks.stripe = { ok: true, message: balance.livemode ? "🔴 Live (produção)" : "🟡 Test (sandbox)", latencyMs: Date.now() - stripeStart };
    } catch (err) {
      checks.stripe = { ok: false, message: err instanceof Error ? err.message : "Erro", latencyMs: Date.now() - stripeStart };
    }
  } else {
    checks.stripe = { ok: false, message: "STRIPE_SECRET_KEY não configurada" };
  }

  const byPlan: Record<string, number> = { free: 0, basic: 0, pro: 0 };
  for (const u of users) byPlan[u.plan] = (byPlan[u.plan] ?? 0) + 1;

  res.json({
    checks,
    server: {
      nodeVersion: process.version, platform: process.platform,
      uptime: Math.floor(process.uptime()),
      memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      freeMemMb: Math.round(os.freemem() / 1024 / 1024),
      cpus: os.cpus().length,
    },
    config: {
      tiktoolsKeySet: !!tiktoolsKey,
      tiktoolsKeyMasked: tiktoolsKey ? maskKey(tiktoolsKey) : null,
      stripeKeySet: !!stripeKey,
      jwtSecretIsDefault: !process.env.JWT_SECRET,
    },
    users: { total: users.length, admins: users.filter((u) => u.isAdmin).length, byPlan },
  });
});

router.get("/admin/alt-api-config", requireAdminMiddleware, (_req, res): void => {
  const cfg = loadAltApiConfig();
  res.json({ ...cfg, apiKey: cfg.apiKey ? maskKey(cfg.apiKey) : "" });
});

router.patch("/admin/alt-api-config", requireAdminMiddleware, (req, res): void => {
  const body = req.body as Partial<AltApiConfig> & { apiKey?: string };
  const existing = loadAltApiConfig();
  const updated: AltApiConfig = {
    enabled: body.enabled ?? existing.enabled,
    provider: body.provider ?? existing.provider,
    baseUrl: body.baseUrl ?? existing.baseUrl,
    apiKeyHeader: body.apiKeyHeader ?? existing.apiKeyHeader,
    apiKey: (body.apiKey && !body.apiKey.includes("...")) ? body.apiKey : existing.apiKey,
    testPath: body.testPath ?? existing.testPath,
    notes: body.notes ?? existing.notes,
  };
  saveAltApiConfig(updated);
  req.log.info({ provider: updated.provider }, "Alt API config updated");
  res.json({ ok: true });
});

router.post("/admin/test-alt-api", requireAdminMiddleware, async (req, res): Promise<void> => {
  const { baseUrl, apiKeyHeader, apiKey, testPath } = req.body as { baseUrl?: string; apiKeyHeader?: string; apiKey?: string; testPath?: string };
  if (!baseUrl?.trim()) { res.json({ ok: false, message: "URL base não fornecida" }); return; }
  try {
    const url = `${baseUrl.trim().replace(/\/$/, "")}${testPath?.trim() || "/"}`;
    const headers: Record<string, string> = {};
    if (apiKey?.trim() && apiKeyHeader?.trim()) headers[apiKeyHeader.trim()] = apiKey.trim();
    const start = Date.now();
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    const latencyMs = Date.now() - start;
    if (r.ok) {
      const text = await r.text().catch(() => "");
      res.json({ ok: true, message: `Conectado! Latência: ${latencyMs}ms`, preview: text.slice(0, 300), latencyMs });
    } else {
      res.json({ ok: false, message: `Status ${r.status} — ${r.statusText}`, latencyMs });
    }
  } catch (err) {
    res.json({ ok: false, message: err instanceof Error ? err.message : "Erro de conexão" });
  }
});

router.get("/admin/tiktools-config", requireAdminMiddleware, (_req, res): void => {
  const key = process.env.TIKTOOLS_API_KEY || loadConfig().apiKey;
  res.json({ apiKeySet: !!key, apiKeyMasked: key ? maskKey(key) : null });
});

router.patch("/admin/tiktools-config", requireAdminMiddleware, (req, res): void => {
  const { apiKey } = req.body as { apiKey?: string };
  if (!apiKey?.trim()) { res.status(400).json({ error: "apiKey é obrigatória" }); return; }
  const cfg = loadConfig();
  cfg.apiKey = apiKey.trim();
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(configFile, JSON.stringify(cfg, null, 2));
  process.env.TIKTOOLS_API_KEY = apiKey.trim();
  req.log.info("tik.tools API key updated via admin panel");
  res.json({ ok: true, apiKeyMasked: maskKey(apiKey.trim()) });
});

// Maintenance mode (kept as file-based — config, not user data)
const maintenanceFile = path.resolve(dataDir, "maintenance.json");

interface PageMaintenance { enabled: boolean; message?: string; estimatedReturn?: string; }
interface MaintenanceConfig {
  enabled: boolean;
  message?: string;
  estimatedReturn?: string;
  landingAlert?: string;
  pages?: Record<string, PageMaintenance>;
}

function loadMaintenance(): MaintenanceConfig {
  try {
    if (fs.existsSync(maintenanceFile)) return JSON.parse(fs.readFileSync(maintenanceFile, "utf-8")) as MaintenanceConfig;
  } catch { /* ignore */ }
  return { enabled: false };
}
function saveMaintenance(m: MaintenanceConfig): void {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(maintenanceFile, JSON.stringify(m, null, 2));
}

router.get("/maintenance", (_req, res): void => { res.json(loadMaintenance()); });
router.get("/admin/maintenance", requireAdminMiddleware, (_req, res): void => { res.json(loadMaintenance()); });
router.patch("/admin/maintenance", requireAdminMiddleware, (req, res): void => {
  const body = req.body as Partial<MaintenanceConfig>;
  const current = loadMaintenance();
  if (body.enabled !== undefined) current.enabled = !!body.enabled;
  if (body.message !== undefined) current.message = body.message?.trim() || undefined;
  if (body.estimatedReturn !== undefined) current.estimatedReturn = body.estimatedReturn?.trim() || undefined;
  if (body.landingAlert !== undefined) current.landingAlert = body.landingAlert?.trim() || undefined;
  if (body.pages !== undefined) current.pages = body.pages;
  saveMaintenance(current);
  req.log.info({ enabled: current.enabled }, "Maintenance mode updated");
  res.json(current);
});

// ── DB Config ─────────────────────────────────────────────────────────────────
const dbConfigFile = path.resolve(dataDir, "db-config.json");

function loadDbConfig(): { url?: string } {
  try {
    if (fs.existsSync(dbConfigFile)) return JSON.parse(fs.readFileSync(dbConfigFile, "utf-8")) as { url?: string };
  } catch { /* ignore */ }
  return {};
}

function parseDbUrl(urlStr: string): { host: string; database: string; user: string; port: string } {
  try {
    const u = new URL(urlStr);
    return { host: u.hostname, database: u.pathname.replace(/^\//, ""), user: u.username, port: u.port || "5432" };
  } catch {
    return { host: "?", database: "?", user: "?", port: "5432" };
  }
}

function maskDbUrl(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    if (u.password) u.password = "***";
    return u.toString();
  } catch { return urlStr; }
}

router.get("/admin/db-config", requireAdminMiddleware, (_req, res): void => {
  const envUrl = process.env.DATABASE_URL;
  const fileUrl = loadDbConfig().url;
  const activeUrl = envUrl || fileUrl || "";
  const source: string = envUrl ? "env" : fileUrl ? "file" : "none";
  const info = activeUrl ? parseDbUrl(activeUrl) : { host: "N/A", database: "N/A", user: "N/A", port: "5432" };
  res.json({ source, host: info.host, database: info.database, user: info.user, port: info.port, maskedUrl: activeUrl ? maskDbUrl(activeUrl) : null });
});

router.patch("/admin/db-config", requireAdminMiddleware, (req: Request, res: Response): void => {
  const { url } = req.body as { url?: string };
  if (!url?.trim()) { res.status(400).json({ error: "url is required" }); return; }
  try { new URL(url.trim()); } catch { res.status(400).json({ error: "Invalid URL format" }); return; }
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dbConfigFile, JSON.stringify({ url: url.trim() }, null, 2));
  req.log.info({ host: parseDbUrl(url.trim()).host }, "DB config updated (restart required)");
  res.json({ ok: true, maskedUrl: maskDbUrl(url.trim()), restartRequired: true });
});

router.post("/admin/db-config/test", requireAdminMiddleware, async (req: Request, res: Response): Promise<void> => {
  const { url } = req.body as { url?: string };
  const testUrl = url?.trim() || process.env.DATABASE_URL || loadDbConfig().url || "";
  if (!testUrl) { res.status(400).json({ ok: false, message: "Nenhuma URL de banco configurada" }); return; }
  const { Pool } = pg;
  const testPool = new Pool({ connectionString: testUrl, connectionTimeoutMillis: 5000, max: 1 });
  try {
    const client = await testPool.connect();
    const result = await client.query<{ version: string }>("SELECT version()");
    client.release();
    await testPool.end();
    const version = result.rows[0]?.version?.split(" ").slice(0, 2).join(" ") ?? "PostgreSQL";
    res.json({ ok: true, message: `Conectado! ${version}` });
  } catch (err) {
    await testPool.end().catch(() => { /* ignore */ });
    res.json({ ok: false, message: err instanceof Error ? err.message : "Erro de conexão" });
  }
});

export default router;
