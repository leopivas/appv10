import { Router, type Request, type Response } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import sizeOf from "image-size";
import { requireAuth } from "./auth";
import { getUserById } from "../lib/users-store";
import { db } from "@workspace/db";
import { mediaItemsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { objectStorageClient } from "../lib/objectStorage";

const router = Router();

const PLAN_LIMITS: Record<string, number> = {
  free: 50 * 1024 * 1024,
  basic: 200 * 1024 * 1024,
  pro: 500 * 1024 * 1024,
};
const CATEGORIES = ["Geral", "Banners", "Logos", "QR Codes", "Thumbnails"];

const SAFE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

export interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  category: string;
  size: number;
  mimeType: string;
  width: number | null;
  height: number | null;
  createdAt: string;
}

// ── GCS helpers ───────────────────────────────────────────────────────────────

function parseGCSPath(fullPath: string): { bucketName: string; objectName: string } {
  const p = fullPath.startsWith("/") ? fullPath : `/${fullPath}`;
  const parts = p.split("/").filter((_, i) => i > 0);
  return { bucketName: parts[0], objectName: parts.slice(1).join("/") };
}

function getPrivateDir(): string {
  const dir = process.env.PRIVATE_OBJECT_DIR;
  if (!dir) throw new Error("PRIVATE_OBJECT_DIR not set — run setupObjectStorage()");
  return dir;
}

function mediaObjectPath(userId: string, filename: string): string {
  return `${getPrivateDir()}/media/${userId}/${filename}`;
}

async function uploadToGCS(
  buffer: Buffer,
  objectFullPath: string,
  contentType: string
): Promise<void> {
  const { bucketName, objectName } = parseGCSPath(objectFullPath);
  const bucket = objectStorageClient.bucket(bucketName);
  await bucket.file(objectName).save(buffer, {
    contentType,
    metadata: { cacheControl: "public, max-age=31536000" },
  });
}

async function deleteFromGCS(objectFullPath: string): Promise<void> {
  try {
    const { bucketName, objectName } = parseGCSPath(objectFullPath);
    await objectStorageClient.bucket(bucketName).file(objectName).delete({ ignoreNotFound: true });
  } catch { /* best-effort */ }
}

async function streamFromGCS(objectFullPath: string, res: Response): Promise<void> {
  const { bucketName, objectName } = parseGCSPath(objectFullPath);
  const file = objectStorageClient.bucket(bucketName).file(objectName);
  const [metadata] = await file.getMetadata();
  res.setHeader("Content-Type", (metadata.contentType as string) || "application/octet-stream");
  res.setHeader("Cache-Control", "public, max-age=31536000");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", "inline");
  if (metadata.size) res.setHeader("Content-Length", String(metadata.size));
  file.createReadStream().pipe(res);
}

// ── Magic-byte validation ─────────────────────────────────────────────────────

function detectImageMime(buf: Buffer): string | undefined {
  if (buf.length < 12) return undefined;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "image/gif";
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "image/webp";
  return undefined;
}

function extractDimensions(buf: Buffer): { width: number | null; height: number | null } {
  try {
    const dims = sizeOf(buf);
    return { width: dims.width ?? null, height: dims.height ?? null };
  } catch {
    return { width: null, height: null };
  }
}

// ── Multer — memory storage ───────────────────────────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (Object.keys(SAFE_EXTENSIONS).includes(file.mimetype)) cb(null, true);
    else cb(new Error("Tipo de arquivo não suportado. Use PNG, JPG, GIF ou WebP."));
  },
});

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /media/files/:userId/:filename — public (no auth), needed for overlay iframes
router.get("/media/files/:userId/:filename", async (req: Request, res: Response): Promise<void> => {
  const { userId, filename } = req.params as { userId: string; filename: string };
  if (!userId || !filename || filename.includes("..")) { res.status(400).end(); return; }
  try {
    await streamFromGCS(mediaObjectPath(userId, filename), res);
  } catch {
    res.status(404).json({ error: "Arquivo não encontrado." });
  }
});

// GET /media — list user media
router.get("/media", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const rows = await db
    .select()
    .from(mediaItemsTable)
    .where(eq(mediaItemsTable.userId, userId))
    .orderBy(desc(mediaItemsTable.createdAt));

  const items: MediaItem[] = rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    originalName: r.originalName,
    category: r.category,
    size: r.size,
    mimeType: r.mimeType,
    width: r.width ?? null,
    height: r.height ?? null,
    createdAt: new Date(r.createdAt).toISOString(),
  }));
  res.json({ items });
});

// GET /media/storage — storage usage
router.get("/media/storage", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const rows = await db
    .select({ size: mediaItemsTable.size })
    .from(mediaItemsTable)
    .where(eq(mediaItemsTable.userId, userId));

  const used = rows.reduce((sum, r) => sum + r.size, 0);
  const user = await getUserById(userId);
  const plan = user?.plan ?? "free";
  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  res.json({ used, limit, plan, count: rows.length, categories: CATEGORIES });
});

// POST /media/upload — upload a file (server validates, then pushes to GCS)
router.post("/media/upload", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;

  const user = await getUserById(userId);
  const plan = user?.plan ?? "free";
  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

  const multerErr = await new Promise<Error | null>((resolve) => {
    upload.single("file")(req, res, (err) => resolve(err as Error | null));
  });

  if (multerErr) { res.status(400).json({ error: multerErr.message }); return; }
  if (!req.file?.buffer) { res.status(400).json({ error: "Nenhum arquivo enviado." }); return; }

  const buf = req.file.buffer;

  const detectedMime = detectImageMime(buf);
  const safeExt = detectedMime ? SAFE_EXTENSIONS[detectedMime] : undefined;
  if (!safeExt) {
    res.status(400).json({ error: "Conteúdo do arquivo inválido. Apenas PNG, JPG, GIF e WebP são aceitos." });
    return;
  }

  const rows = await db
    .select({ size: mediaItemsTable.size })
    .from(mediaItemsTable)
    .where(eq(mediaItemsTable.userId, userId));
  const usedBytes = rows.reduce((sum, r) => sum + r.size, 0);
  if (usedBytes + req.file.size > limit) {
    res.status(413).json({ error: "Limite de armazenamento atingido. Faça upgrade do plano." });
    return;
  }

  const uuid = crypto.randomUUID();
  const safeFilename = `${uuid}${safeExt}`;
  const objectPath = mediaObjectPath(userId, safeFilename);

  await uploadToGCS(buf, objectPath, detectedMime as string);

  const { width, height } = extractDimensions(buf);
  const category = CATEGORIES.includes(req.body.category as string) ? (req.body.category as string) : "Geral";
  const now = Date.now();

  const item = {
    id: uuid,
    userId,
    filename: safeFilename,
    originalName: ((req.body.name as string)?.trim() || req.file.originalname) ?? safeFilename,
    objectPath,
    category,
    size: req.file.size,
    mimeType: detectedMime as string,
    width: width ?? null,
    height: height ?? null,
    createdAt: now,
  };

  await db.insert(mediaItemsTable).values(item);

  const out: MediaItem = {
    id: item.id,
    filename: item.filename,
    originalName: item.originalName,
    category: item.category,
    size: item.size,
    mimeType: item.mimeType,
    width: item.width,
    height: item.height,
    createdAt: new Date(now).toISOString(),
  };

  res.json({ item: out, url: `/api/media/files/${userId}/${safeFilename}` });
});

// PATCH /media/:id — rename / change category
router.patch("/media/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const { id } = req.params as { id: string };
  const { name, category } = req.body as { name?: string; category?: string };

  const [existing] = await db
    .select()
    .from(mediaItemsTable)
    .where(and(eq(mediaItemsTable.id, id), eq(mediaItemsTable.userId, userId)));
  if (!existing) { res.status(404).json({ error: "Item não encontrado." }); return; }

  const updates: Partial<typeof mediaItemsTable.$inferInsert> = {};
  if (name?.trim()) updates.originalName = name.trim();
  if (category && CATEGORIES.includes(category)) updates.category = category;

  if (Object.keys(updates).length === 0) {
    const noOp: MediaItem = {
      id: existing.id, filename: existing.filename, originalName: existing.originalName,
      category: existing.category, size: existing.size, mimeType: existing.mimeType,
      width: existing.width ?? null, height: existing.height ?? null,
      createdAt: new Date(existing.createdAt).toISOString(),
    };
    res.json({ item: noOp }); return;
  }

  const [updated] = await db
    .update(mediaItemsTable)
    .set(updates)
    .where(and(eq(mediaItemsTable.id, id), eq(mediaItemsTable.userId, userId)))
    .returning();

  const out: MediaItem = {
    id: updated.id,
    filename: updated.filename,
    originalName: updated.originalName,
    category: updated.category,
    size: updated.size,
    mimeType: updated.mimeType,
    width: updated.width ?? null,
    height: updated.height ?? null,
    createdAt: new Date(updated.createdAt).toISOString(),
  };
  res.json({ item: out });
});

// DELETE /media/:id — delete file and metadata
router.delete("/media/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const { id } = req.params as { id: string };

  const [existing] = await db
    .select()
    .from(mediaItemsTable)
    .where(and(eq(mediaItemsTable.id, id), eq(mediaItemsTable.userId, userId)));
  if (!existing) { res.status(404).json({ error: "Item não encontrado." }); return; }

  await deleteFromGCS(existing.objectPath);
  await db.delete(mediaItemsTable).where(and(eq(mediaItemsTable.id, id), eq(mediaItemsTable.userId, userId)));

  res.json({ ok: true });
});

// ── Legacy disk migration ─────────────────────────────────────────────────────
// Runs once at startup if old data/media/ directory exists on disk.
// Idempotent: skips items already present in DB.

interface LegacyMediaItem {
  id: string;
  filename: string;
  originalName: string;
  category: string;
  size: number;
  mimeType: string;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export async function runLegacyMediaMigration(): Promise<void> {
  const mediaDir = path.join(process.cwd(), "data", "media");
  if (!fs.existsSync(mediaDir)) return;

  let userDirs: string[];
  try {
    userDirs = fs.readdirSync(mediaDir).filter((f) =>
      fs.statSync(path.join(mediaDir, f)).isDirectory()
    );
  } catch { return; }

  let migrated = 0;
  let skipped = 0;

  for (const userId of userDirs) {
    const indexFile = path.join(mediaDir, userId, "index.json");
    if (!fs.existsSync(indexFile)) continue;

    let items: LegacyMediaItem[];
    try {
      items = JSON.parse(fs.readFileSync(indexFile, "utf-8")) as LegacyMediaItem[];
    } catch { continue; }

    for (const item of items) {
      const filePath = path.join(mediaDir, userId, item.filename);
      if (!fs.existsSync(filePath)) { skipped++; continue; }

      const existing = await db
        .select({ id: mediaItemsTable.id })
        .from(mediaItemsTable)
        .where(eq(mediaItemsTable.id, item.id));
      if (existing.length > 0) { skipped++; continue; }

      try {
        const buf = fs.readFileSync(filePath);
        const objectPath = mediaObjectPath(userId, item.filename);
        await uploadToGCS(buf, objectPath, item.mimeType);
        await db.insert(mediaItemsTable).values({
          id: item.id,
          userId,
          originalName: item.originalName,
          filename: item.filename,
          objectPath,
          category: item.category,
          size: item.size,
          mimeType: item.mimeType,
          width: item.width ?? null,
          height: item.height ?? null,
          createdAt: new Date(item.createdAt).getTime(),
        });
        migrated++;
      } catch { skipped++; }
    }
  }

  if (migrated > 0 || skipped > 0) {
    console.log(`[media-migration] migrated=${migrated} skipped=${skipped}`);
  }
}

export default router;
