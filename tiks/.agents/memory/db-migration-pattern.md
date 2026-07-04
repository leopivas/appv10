---
name: DB schema migration pattern
description: How to add new tables when drizzle-kit push cannot connect from bash
---

## Rule
`drizzle-kit push` fails from the bash shell environment because the database is not reachable from outside the running server process. Do not retry it — use the startup.ts additive migration pattern instead.

## How to apply
When adding a new table:
1. Create the Drizzle schema file in `lib/db/src/schema/<table>.ts`
2. Export it from `lib/db/src/schema/index.ts`
3. Add a `CREATE TABLE IF NOT EXISTS` statement to `artifacts/api-server/src/startup.ts` inside the existing `pool.query(...)` block — same as the existing ALTER TABLE IF EXISTS pattern
4. The table is created on the next server restart

**Why:** The PostgreSQL DB is provisioned by Replit and only accessible to the running server process via the DATABASE_URL env var. From bash, the TCP connection to the DB host is refused (ECONNREFUSED). The startup.ts pattern is already used for additive ALTER TABLE migrations and is the established pattern for this project.

## Pattern used in startup.ts
```typescript
pool.query(`
  -- existing migrations...
  CREATE TABLE IF NOT EXISTS my_new_table (
    id TEXT PRIMARY KEY,
    ...
  );
  CREATE INDEX IF NOT EXISTS my_new_table_user_id_idx ON my_new_table(user_id);
`).catch(() => {}).finally(() => pool.end());
```
