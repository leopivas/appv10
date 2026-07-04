import { Router, type IRouter, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { requireAdminMiddleware } from "./auth";

const router: IRouter = Router();

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();
const dataDir = path.resolve(workspaceRoot, "artifacts/api-server/data");
const stripeConfigFile = path.resolve(dataDir, "stripe-config.json");

interface StripeConfigFile {
  publishableKey?: string;
  priceIdBasic?: string;
  priceIdPro?: string;
  paymentsEnabled?: boolean;
}

function loadStripeConfig(): StripeConfigFile {
  try {
    if (fs.existsSync(stripeConfigFile)) return JSON.parse(fs.readFileSync(stripeConfigFile, "utf-8")) as StripeConfigFile;
  } catch { /* ignore */ }
  return {};
}

function saveStripeConfig(cfg: StripeConfigFile): void {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(stripeConfigFile, JSON.stringify(cfg, null, 2));
}

// GET /api/admin/stripe-config
router.get("/admin/stripe-config", requireAdminMiddleware, (_req, res): void => {
  const stored = loadStripeConfig();
  res.json({
    secretKeySet: !!process.env.STRIPE_SECRET_KEY,
    webhookSecretSet: !!process.env.STRIPE_WEBHOOK_SECRET,
    publishableKey: stored.publishableKey ?? process.env.STRIPE_PUBLISHABLE_KEY ?? null,
    priceIdBasic: stored.priceIdBasic ?? process.env.STRIPE_PRICE_ID_BASIC ?? null,
    priceIdPro: stored.priceIdPro ?? process.env.STRIPE_PRICE_ID_PRO ?? null,
    tiktoolsKeySet: !!process.env.TIKTOOLS_API_KEY,
    paymentsEnabled: stored.paymentsEnabled ?? true,
  });
});

// PATCH /api/admin/stripe-config
router.patch("/admin/stripe-config", requireAdminMiddleware, (req, res): void => {
  const { publishableKey, priceIdBasic, priceIdPro, paymentsEnabled } = req.body as {
    publishableKey?: string | null; priceIdBasic?: string | null; priceIdPro?: string | null; paymentsEnabled?: boolean;
  };
  const stored = loadStripeConfig();
  if (publishableKey !== undefined) stored.publishableKey = publishableKey || undefined;
  if (priceIdBasic !== undefined) stored.priceIdBasic = priceIdBasic || undefined;
  if (priceIdPro !== undefined) stored.priceIdPro = priceIdPro || undefined;
  if (paymentsEnabled !== undefined) stored.paymentsEnabled = paymentsEnabled;
  saveStripeConfig(stored);
  req.log.info({ paymentsEnabled }, "Stripe config updated via admin panel");
  res.json({ ok: true });
});

// POST /api/admin/test-tiktools
router.post("/admin/test-tiktools", requireAdminMiddleware, async (req, res): Promise<void> => {
  const apiKey = process.env.TIKTOOLS_API_KEY;
  if (!apiKey) { res.json({ ok: false, message: "TIKTOOLS_API_KEY is not set in environment variables." }); return; }
  try {
    const r = await fetch("https://api.tik.tools/api/live/top-channels", { signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const json = await r.json() as { channels?: unknown[] };
      res.json({ ok: true, message: `Connected! Found ${json.channels?.length ?? 0} live channels.` });
    } else {
      res.json({ ok: false, message: `API responded with status ${r.status}` });
    }
  } catch (err) {
    req.log.error({ err }, "tik.tools test failed");
    res.json({ ok: false, message: err instanceof Error ? err.message : "Connection error" });
  }
});

// POST /api/admin/test-stripe
router.post("/admin/test-stripe", requireAdminMiddleware, async (req, res): Promise<void> => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) { res.json({ ok: false, message: "STRIPE_SECRET_KEY is not set in environment variables." }); return; }
  try {
    const Stripe = (await import("stripe")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stripe = new Stripe(secretKey, { apiVersion: "2026-06-24.dahlia" as any });
    const balance = await stripe.balance.retrieve();
    res.json({ ok: true, message: `Stripe connected! Mode: ${balance.livemode ? "🔴 Live (production)" : "🟡 Test (sandbox)"}` });
  } catch (err) {
    req.log.error({ err }, "Stripe test failed");
    res.json({ ok: false, message: err instanceof Error ? err.message : "Failed to connect to Stripe" });
  }
});

export default router;
