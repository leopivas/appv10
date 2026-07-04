import fs from "fs";
import path from "path";
import pg from "pg";

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();
const dbConfigFile = path.resolve(workspaceRoot, "artifacts/api-server/data/db-config.json");

try {
  if (fs.existsSync(dbConfigFile)) {
    const cfg = JSON.parse(fs.readFileSync(dbConfigFile, "utf-8")) as { url?: string };
    if (cfg.url) {
      process.env.DATABASE_URL = cfg.url;
    }
  }
} catch {
  // ignore — fall back to DATABASE_URL env var
}

// Run additive schema migrations at startup
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  const { Pool } = pg;
  const pool = new Pool({ connectionString: dbUrl });
  pool.query(`
    ALTER TABLE IF EXISTS ui_config
      ADD COLUMN IF NOT EXISTS header_config jsonb,
      ADD COLUMN IF NOT EXISTS featured_slides jsonb;
    ALTER TABLE IF EXISTS announcements
      ADD COLUMN IF NOT EXISTS image_url text;
    CREATE TABLE IF NOT EXISTS event_rules (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT true,
      trigger_type TEXT NOT NULL,
      trigger_filters JSONB NOT NULL DEFAULT '{}',
      actions JSONB NOT NULL DEFAULT '[]',
      cooldown_seconds INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS event_rules_user_id_idx ON event_rules(user_id);
    ALTER TABLE IF EXISTS users
      ADD COLUMN IF NOT EXISTS public_profile_enabled boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS profile_bio text,
      ADD COLUMN IF NOT EXISTS profile_banner text,
      ADD COLUMN IF NOT EXISTS social_links text,
      ADD COLUMN IF NOT EXISTS profile_sections text,
      ADD COLUMN IF NOT EXISTS total_live_sessions integer NOT NULL DEFAULT 0;
    CREATE TABLE IF NOT EXISTS layout_presets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      layers TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS layout_presets_user_id_idx ON layout_presets(user_id);
    CREATE TABLE IF NOT EXISTS media_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      original_name TEXT NOT NULL,
      filename TEXT NOT NULL,
      object_path TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Geral',
      size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      created_at BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS media_items_user_id_idx ON media_items(user_id);
  `).catch(() => { /* ignore — table may not exist yet on first boot */ })
    .finally(() => pool.end());
}
