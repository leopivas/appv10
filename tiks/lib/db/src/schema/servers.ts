import { pgTable, text, boolean, bigint } from "drizzle-orm/pg-core";

export const serversTable = pgTable("servers", {
  id:              text("id").primaryKey(),
  name:            text("name").notNull(),
  description:     text("description"),
  hostname:        text("hostname"),
  agentKey:        text("agent_key").notNull(),
  tags:            text("tags"),
  online:          boolean("online").notNull().default(false),
  lastSeenAt:      bigint("last_seen_at", { mode: "number" }),
  agentVersion:    text("agent_version"),
  os:              text("os"),
  cpu:             bigint("cpu", { mode: "number" }).default(0),
  memUsedMb:       bigint("mem_used_mb", { mode: "number" }).default(0),
  memTotalMb:      bigint("mem_total_mb", { mode: "number" }).default(0),
  createdAt:       bigint("created_at", { mode: "number" }).notNull(),
  updatedAt:       bigint("updated_at", { mode: "number" }).notNull(),
});

export const serverEmulatorsTable = pgTable("server_emulators", {
  id:         text("id").primaryKey(),
  serverId:   text("server_id").notNull(),
  name:       text("name").notNull(),
  processCmd: text("process_cmd").notNull(),
  workingDir: text("working_dir"),
  autoStart:  boolean("auto_start").notNull().default(false),
  status:     text("status").notNull().default("stopped"), // stopped | starting | running | error
  pid:        bigint("pid", { mode: "number" }),
  lastError:  text("last_error"),
  lastLogs:   text("last_logs"),
  updatedAt:  bigint("updated_at", { mode: "number" }).notNull(),
  createdAt:  bigint("created_at", { mode: "number" }).notNull(),
});

export const serverCommandsTable = pgTable("server_commands", {
  id:         text("id").primaryKey(),
  serverId:   text("server_id").notNull(),
  emulatorId: text("emulator_id"),
  action:     text("action").notNull(), // start | stop | restart | logs | exec
  payload:    text("payload"),
  status:     text("status").notNull().default("pending"), // pending | done | error
  result:     text("result"),
  createdAt:  bigint("created_at", { mode: "number" }).notNull(),
  pickedAt:   bigint("picked_at", { mode: "number" }),
  finishedAt: bigint("finished_at", { mode: "number" }),
});
