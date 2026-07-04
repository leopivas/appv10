import { Router, type IRouter } from "express";
import { SaveConfigBody } from "@workspace/api-zod";
import fs from "fs";
import path from "path";

const router: IRouter = Router();

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const configDir = path.resolve(workspaceRoot, "artifacts/api-server/data");
const configFile = path.resolve(configDir, "config.json");

function loadConfig(): { apiKey?: string } {
  try {
    if (fs.existsSync(configFile)) {
      return JSON.parse(fs.readFileSync(configFile, "utf-8"));
    }
  } catch {
    // ignore
  }
  return {};
}

function saveConfigToDisk(cfg: { apiKey?: string }): void {
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(configFile, JSON.stringify(cfg, null, 2));
}

function getActiveApiKey(): string | undefined {
  // Prefer env var (set at startup), fallback to persisted config
  return process.env.TIKTOOLS_API_KEY || loadConfig().apiKey;
}

function maskKey(key: string): string {
  if (key.length <= 8) return "***";
  return key.slice(0, 6) + "..." + key.slice(-4);
}

router.get("/config", async (req, res): Promise<void> => {
  const key = getActiveApiKey();
  res.json({
    apiKeySet: !!key,
    apiKeyMasked: key ? maskKey(key) : null,
    tier: null,
  });
});

router.post("/config", async (req, res): Promise<void> => {
  const parsed = SaveConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const cfg = loadConfig();
    cfg.apiKey = parsed.data.apiKey;
    saveConfigToDisk(cfg);
    // Update process env so subsequent requests use the new key
    process.env.TIKTOOLS_API_KEY = parsed.data.apiKey;
    req.log.info("API key updated via config endpoint");
    res.json({
      apiKeySet: true,
      apiKeyMasked: maskKey(parsed.data.apiKey),
      tier: null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to save config");
    res.status(500).json({ error: "Failed to save config" });
  }
});

export default router;
