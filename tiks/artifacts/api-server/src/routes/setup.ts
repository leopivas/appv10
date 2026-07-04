import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { getUserByEmail, countUsers, createUser, makeId } from "../lib/users-store";
import { seedDefaultPlans } from "../lib/plans-store";

const router: IRouter = Router();

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();
const dataDir = path.resolve(workspaceRoot, "artifacts/api-server/data");
const configFile = path.resolve(dataDir, "config.json");
const stripeConfigFile = path.resolve(dataDir, "stripe-config.json");

function loadConfig(): { apiKey?: string } {
  try {
    if (fs.existsSync(configFile)) return JSON.parse(fs.readFileSync(configFile, "utf-8")) as { apiKey?: string };
  } catch { /* ignore */ }
  return {};
}

function saveConfigFile(cfg: { apiKey?: string }): void {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(configFile, JSON.stringify(cfg, null, 2));
}

function maskKey(key: string): string {
  if (key.length <= 8) return "***";
  return key.slice(0, 6) + "..." + key.slice(-4);
}

const DEFAULT_JWT_SECRET = "creatools-secret-change-in-production";
const JWT_SECRET = process.env.JWT_SECRET ?? DEFAULT_JWT_SECRET;

router.get("/setup/status", async (_req, res): Promise<void> => {
  const userCount = await countUsers();
  const apiKey = process.env.TIKTOOLS_API_KEY || loadConfig().apiKey;
  res.json({
    needsSetup: !userCount || !apiKey,
    hasUsers: userCount > 0,
    hasApiKey: !!apiKey,
    apiKeyMasked: apiKey ? maskKey(apiKey) : null,
  });
});

router.post("/setup/complete", async (req, res): Promise<void> => {
  const { adminName, adminEmail, adminPassword, tiktoolsApiKey, stripePublishableKey, stripeSecretKey, stripeWebhookSecret, stripeBasicPriceId, stripeProPriceId, enablePayments } = req.body as {
    adminName?: string; adminEmail?: string; adminPassword?: string;
    tiktoolsApiKey?: string; stripePublishableKey?: string; stripeSecretKey?: string;
    stripeWebhookSecret?: string; stripeBasicPriceId?: string; stripeProPriceId?: string; enablePayments?: boolean;
  };

  const isFirstRun = (await countUsers()) === 0;

  if (isFirstRun && (!adminName?.trim() || !adminEmail?.trim() || !adminPassword?.trim())) {
    res.status(400).json({ error: "Nome, e-mail e senha do admin são obrigatórios" }); return;
  }
  if (isFirstRun && adminPassword && adminPassword.length < 6) {
    res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres" }); return;
  }
  if (!tiktoolsApiKey?.trim()) {
    res.status(400).json({ error: "A chave da API tik.tools é obrigatória" }); return;
  }

  try {
    const cfg = loadConfig();
    cfg.apiKey = tiktoolsApiKey.trim();
    saveConfigFile(cfg);
    process.env.TIKTOOLS_API_KEY = tiktoolsApiKey.trim();

    let apiTestOk = false;
    let apiTestMessage = "";
    try {
      const r = await fetch("https://api.tik.tools/api/live/top-channels", {
        headers: { "x-api-key": tiktoolsApiKey.trim() },
        signal: AbortSignal.timeout(8000),
      });
      apiTestOk = r.ok;
      apiTestMessage = r.ok ? "Conexão com tik.tools OK!" : `API retornou status ${r.status}`;
    } catch (err) {
      apiTestMessage = err instanceof Error ? err.message : "Erro de conexão";
    }

    if (stripePublishableKey || stripeBasicPriceId || stripeProPriceId || enablePayments !== undefined) {
      let stripeConfig: Record<string, unknown> = {};
      try {
        if (fs.existsSync(stripeConfigFile)) stripeConfig = JSON.parse(fs.readFileSync(stripeConfigFile, "utf-8")) as Record<string, unknown>;
      } catch { /* ignore */ }
      if (stripePublishableKey) stripeConfig.publishableKey = stripePublishableKey;
      if (stripeSecretKey) process.env.STRIPE_SECRET_KEY = stripeSecretKey;
      if (stripeWebhookSecret) process.env.STRIPE_WEBHOOK_SECRET = stripeWebhookSecret;
      if (stripeBasicPriceId) stripeConfig.priceIdBasic = stripeBasicPriceId;
      if (stripeProPriceId) stripeConfig.priceIdPro = stripeProPriceId;
      if (enablePayments !== undefined) stripeConfig.paymentsEnabled = enablePayments;
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(stripeConfigFile, JSON.stringify(stripeConfig, null, 2));
    }

    // Seed default plans if needed
    await seedDefaultPlans();

    let token: string | null = null;
    if (isFirstRun && adminName && adminEmail && adminPassword) {
      const now = new Date().toISOString();
      const newUser = await createUser({
        id: makeId(),
        email: adminEmail.trim().toLowerCase(),
        name: adminName.trim(),
        passwordHash: await bcrypt.hash(adminPassword, 10),
        createdAt: now,
        plan: "free",
        isAdmin: true,
        lastLoginAt: now,
      });
      token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: "30d" });
    }

    res.json({ ok: true, token, apiTestOk, apiTestMessage, message: isFirstRun ? "Instalação concluída! Conta admin criada." : "Configuração atualizada." });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Erro interno" });
  }
});

router.post("/setup/test-api", async (req, res): Promise<void> => {
  const { apiKey } = req.body as { apiKey?: string };
  if (!apiKey?.trim()) { res.status(400).json({ ok: false, message: "Chave da API não fornecida" }); return; }
  try {
    const r = await fetch("https://api.tik.tools/api/live/top-channels", {
      headers: { "x-api-key": apiKey.trim() },
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) {
      const json = await r.json() as { channels?: unknown[] };
      res.json({ ok: true, message: `Conectado! Encontrou ${json.channels?.length ?? 0} canais ao vivo.` });
    } else {
      const body = await r.text();
      res.json({ ok: false, message: `API retornou status ${r.status}: ${body.slice(0, 200)}` });
    }
  } catch (err) {
    res.json({ ok: false, message: err instanceof Error ? err.message : "Erro de conexão" });
  }
});

export default router;
