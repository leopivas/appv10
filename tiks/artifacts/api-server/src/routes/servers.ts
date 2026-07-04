import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { serversTable, serverEmulatorsTable, serverCommandsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAdminMiddleware } from "./auth";
import crypto from "crypto";

const router: IRouter = Router();

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}
function makeAgentKey(): string {
  return `srvk_${crypto.randomBytes(24).toString("hex")}`;
}
const now = () => Date.now();

// Agent auth (uses X-Agent-Key header)
async function requireAgent(req: Request, res: Response, next: NextFunction) {
  const key = req.headers["x-agent-key"];
  if (typeof key !== "string" || !key.startsWith("srvk_")) {
    res.status(401).json({ error: "Missing agent key" }); return;
  }
  const rows = await db.select().from(serversTable).where(eq(serversTable.agentKey, key));
  if (!rows[0]) { res.status(401).json({ error: "Invalid agent key" }); return; }
  (req as Request & { serverId: string }).serverId = rows[0].id;
  next();
}

// ── Admin: list servers ────────────────────────────────────────────────────────
router.get("/servers", requireAdminMiddleware, async (_req, res) => {
  const servers = await db.select().from(serversTable).orderBy(desc(serversTable.createdAt));
  const emus = await db.select().from(serverEmulatorsTable);
  res.json({
    servers: servers.map((s) => ({
      ...s,
      // hide agent key by default
      agentKeyMasked: `${s.agentKey.slice(0, 10)}…${s.agentKey.slice(-4)}`,
      agentKey: undefined,
      emulators: emus.filter((e) => e.serverId === s.id),
    })),
  });
});

// ── Admin: reveal agent key ─────────────────────────────────────────────────────
router.get("/servers/:id/agent-key", requireAdminMiddleware, async (req, res) => {
  const rows = await db.select().from(serversTable).where(eq(serversTable.id, req.params.id));
  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ agentKey: rows[0].agentKey });
});

// ── Admin: create server ───────────────────────────────────────────────────────
router.post("/servers", requireAdminMiddleware, async (req, res) => {
  const { name, description, hostname, tags } = req.body as {
    name?: string; description?: string; hostname?: string; tags?: string;
  };
  if (!name?.trim()) { res.status(400).json({ error: "name is required" }); return; }
  const t = now();
  const row = await db.insert(serversTable).values({
    id: makeId("srv"),
    name: name.trim(),
    description: description ?? null,
    hostname: hostname ?? null,
    tags: tags ?? null,
    agentKey: makeAgentKey(),
    online: false,
    createdAt: t,
    updatedAt: t,
  }).returning();
  res.status(201).json({ server: row[0] });
});

// ── Admin: patch server ────────────────────────────────────────────────────────
router.patch("/servers/:id", requireAdminMiddleware, async (req, res) => {
  const { name, description, hostname, tags } = req.body as {
    name?: string; description?: string; hostname?: string; tags?: string;
  };
  const updates: Record<string, unknown> = { updatedAt: now() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (hostname !== undefined) updates.hostname = hostname;
  if (tags !== undefined) updates.tags = tags;
  const rows = await db.update(serversTable).set(updates).where(eq(serversTable.id, req.params.id)).returning();
  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ server: rows[0] });
});

// ── Admin: rotate agent key ────────────────────────────────────────────────────
router.post("/servers/:id/rotate-key", requireAdminMiddleware, async (req, res) => {
  const newKey = makeAgentKey();
  const rows = await db.update(serversTable).set({ agentKey: newKey, updatedAt: now() })
    .where(eq(serversTable.id, req.params.id)).returning();
  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ agentKey: newKey });
});

// ── Admin: delete server ───────────────────────────────────────────────────────
router.delete("/servers/:id", requireAdminMiddleware, async (req, res) => {
  await db.delete(serverEmulatorsTable).where(eq(serverEmulatorsTable.serverId, req.params.id));
  await db.delete(serverCommandsTable).where(eq(serverCommandsTable.serverId, req.params.id));
  await db.delete(serversTable).where(eq(serversTable.id, req.params.id));
  res.json({ ok: true });
});

// ── Admin: create emulator (process) ───────────────────────────────────────────
router.post("/servers/:id/emulators", requireAdminMiddleware, async (req, res) => {
  const { name, processCmd, workingDir, autoStart } = req.body as {
    name?: string; processCmd?: string; workingDir?: string; autoStart?: boolean;
  };
  if (!name?.trim() || !processCmd?.trim()) {
    res.status(400).json({ error: "name and processCmd are required" }); return;
  }
  const t = now();
  const row = await db.insert(serverEmulatorsTable).values({
    id: makeId("emu"),
    serverId: req.params.id,
    name: name.trim(),
    processCmd: processCmd.trim(),
    workingDir: workingDir ?? null,
    autoStart: !!autoStart,
    status: "stopped",
    createdAt: t,
    updatedAt: t,
  }).returning();
  res.status(201).json({ emulator: row[0] });
});

router.patch("/servers/:id/emulators/:emuId", requireAdminMiddleware, async (req, res) => {
  const { name, processCmd, workingDir, autoStart } = req.body as {
    name?: string; processCmd?: string; workingDir?: string; autoStart?: boolean;
  };
  const updates: Record<string, unknown> = { updatedAt: now() };
  if (name !== undefined) updates.name = name;
  if (processCmd !== undefined) updates.processCmd = processCmd;
  if (workingDir !== undefined) updates.workingDir = workingDir;
  if (autoStart !== undefined) updates.autoStart = autoStart;
  const rows = await db.update(serverEmulatorsTable).set(updates)
    .where(and(eq(serverEmulatorsTable.id, req.params.emuId), eq(serverEmulatorsTable.serverId, req.params.id)))
    .returning();
  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ emulator: rows[0] });
});

router.delete("/servers/:id/emulators/:emuId", requireAdminMiddleware, async (req, res) => {
  await db.delete(serverEmulatorsTable)
    .where(and(eq(serverEmulatorsTable.id, req.params.emuId), eq(serverEmulatorsTable.serverId, req.params.id)));
  res.json({ ok: true });
});

// ── Admin: send command (start/stop/restart/logs/exec) ─────────────────────────
router.post("/servers/:id/commands", requireAdminMiddleware, async (req, res) => {
  const { emulatorId, action, payload } = req.body as {
    emulatorId?: string; action?: string; payload?: string;
  };
  if (!action || !["start","stop","restart","logs","exec"].includes(action)) {
    res.status(400).json({ error: "Invalid action" }); return;
  }
  const t = now();
  const row = await db.insert(serverCommandsTable).values({
    id: makeId("cmd"),
    serverId: req.params.id,
    emulatorId: emulatorId ?? null,
    action,
    payload: payload ?? null,
    status: "pending",
    createdAt: t,
  }).returning();
  // update emulator status hint
  if (emulatorId && (action === "start" || action === "restart")) {
    await db.update(serverEmulatorsTable).set({ status: "starting", updatedAt: t })
      .where(eq(serverEmulatorsTable.id, emulatorId));
  }
  if (emulatorId && action === "stop") {
    await db.update(serverEmulatorsTable).set({ status: "stopping" as unknown as string, updatedAt: t })
      .where(eq(serverEmulatorsTable.id, emulatorId));
  }
  res.status(201).json({ command: row[0] });
});

// ── Admin: list recent commands for a server ───────────────────────────────────
router.get("/servers/:id/commands", requireAdminMiddleware, async (req, res) => {
  const rows = await db.select().from(serverCommandsTable)
    .where(eq(serverCommandsTable.serverId, req.params.id))
    .orderBy(desc(serverCommandsTable.createdAt))
    .limit(50);
  res.json({ commands: rows });
});

// ── Admin: aggregated logs for an emulator ─────────────────────────────────────
router.get("/servers/:id/emulators/:emuId/logs", requireAdminMiddleware, async (req, res) => {
  const rows = await db.select().from(serverEmulatorsTable)
    .where(and(eq(serverEmulatorsTable.id, req.params.emuId), eq(serverEmulatorsTable.serverId, req.params.id)));
  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ logs: rows[0].lastLogs ?? "", updatedAt: rows[0].updatedAt });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT ENDPOINTS (called from the customer's VPS agent — auth via X-Agent-Key)
// ═══════════════════════════════════════════════════════════════════════════════

// Agent heartbeat + fetch pending commands + push status
router.post("/agent/poll", requireAgent, async (req, res) => {
  const serverId = (req as Request & { serverId: string }).serverId;
  const { hostname, os: osName, agentVersion, cpu, memUsedMb, memTotalMb, statuses } = req.body as {
    hostname?: string; os?: string; agentVersion?: string;
    cpu?: number; memUsedMb?: number; memTotalMb?: number;
    statuses?: Array<{ emulatorId: string; status: string; pid?: number; lastError?: string; lastLogs?: string }>;
  };

  const t = now();
  await db.update(serversTable).set({
    online: true, lastSeenAt: t, updatedAt: t,
    hostname: hostname ?? null,
    os: osName ?? null,
    agentVersion: agentVersion ?? null,
    cpu: typeof cpu === "number" ? Math.round(cpu) : 0,
    memUsedMb: typeof memUsedMb === "number" ? Math.round(memUsedMb) : 0,
    memTotalMb: typeof memTotalMb === "number" ? Math.round(memTotalMb) : 0,
  }).where(eq(serversTable.id, serverId));

  if (Array.isArray(statuses)) {
    for (const st of statuses) {
      if (!st?.emulatorId) continue;
      await db.update(serverEmulatorsTable).set({
        status: st.status ?? "unknown",
        pid: typeof st.pid === "number" ? st.pid : null,
        lastError: st.lastError ?? null,
        lastLogs: st.lastLogs ?? undefined,
        updatedAt: t,
      }).where(and(eq(serverEmulatorsTable.id, st.emulatorId), eq(serverEmulatorsTable.serverId, serverId)));
    }
  }

  // fetch and claim pending commands
  const pending = await db.select().from(serverCommandsTable)
    .where(and(eq(serverCommandsTable.serverId, serverId), eq(serverCommandsTable.status, "pending")))
    .orderBy(serverCommandsTable.createdAt).limit(10);

  const claimed: typeof pending = [];
  for (const c of pending) {
    const upd = await db.update(serverCommandsTable)
      .set({ status: "picked" as unknown as string, pickedAt: t })
      .where(and(eq(serverCommandsTable.id, c.id), eq(serverCommandsTable.status, "pending")))
      .returning();
    if (upd[0]) claimed.push(upd[0]);
  }

  const emulators = await db.select().from(serverEmulatorsTable).where(eq(serverEmulatorsTable.serverId, serverId));

  res.json({
    ok: true,
    serverId,
    now: t,
    commands: claimed,
    emulators: emulators.map((e) => ({
      id: e.id, name: e.name, processCmd: e.processCmd, workingDir: e.workingDir,
      autoStart: e.autoStart, status: e.status,
    })),
  });
});

// Agent reports command result
router.post("/agent/commands/:cmdId/result", requireAgent, async (req, res) => {
  const serverId = (req as Request & { serverId: string }).serverId;
  const { status, result } = req.body as { status?: string; result?: string };
  const rows = await db.update(serverCommandsTable)
    .set({ status: status ?? "done", result: result ?? null, finishedAt: now() })
    .where(and(eq(serverCommandsTable.id, req.params.cmdId), eq(serverCommandsTable.serverId, serverId)))
    .returning();
  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ok: true });
});

// Background: mark servers offline if no heartbeat > 45s
setInterval(async () => {
  try {
    const cutoff = Date.now() - 45_000;
    const rows = await db.select().from(serversTable).where(eq(serversTable.online, true));
    for (const s of rows) {
      if ((s.lastSeenAt ?? 0) < cutoff) {
        await db.update(serversTable).set({ online: false, updatedAt: Date.now() }).where(eq(serversTable.id, s.id));
      }
    }
  } catch { /* ignore */ }
}, 15_000);

export default router;
