---
name: Drizzle PostgreSQL migration
description: How JSON file stores were migrated to async Drizzle/PostgreSQL stores and patterns used in routes
---

## Rule
All user data (users, plans, roles, support, announcements, ui_config) is now stored in PostgreSQL via Drizzle ORM. JSON files are kept only for config (tiktools key, stripe config, maintenance, landing, alt-api config).

## Stores (lib/users-store.ts, plans-store.ts, roles-store.ts, support-store.ts, ui-config-store.ts)
All store functions are async. Old `loadUsers()/saveUsers()` sync pattern is gone.

Key functions:
- users: getUserById, getAllUsers, createUser, updateUser, deleteUserById, emailConflictExists, tiktokUsernameConflictExists, countUsers
- plans: getAllPlans, getPlanById, createPlan, updatePlan, deletePlan, seedDefaultPlans (called on startup)
- roles: getAllRoles, getRoleById, createRole, updateRole, deleteRole
- support: getTicketsByUser, getAllTickets, getTicketById, createTicket, updateTicket, getMessagesByTicket, addMessage
- ui_config: loadUIConfig, saveUIConfig (upsert to DB)
- announcements: inline in announcements.ts route using @workspace/db directly

## requireAdmin middleware pattern
Old callback-based `requireAdmin` helper removed from all routes. All routes now import `requireAdminMiddleware` from `./auth` — it's an async Express 5 middleware that checks JWT + DB admin status.

**Why:** Express 5 supports async middleware natively; callback pattern was incompatible with async DB calls.

## Startup seeding
`seedDefaultPlans()` called non-blocking in app.ts via dynamic import. Seeds 3 default plans if table is empty.

## Data migration
One-time script migrated 6 users, 4 plans, 1 role, 1 announcement, UI config from JSON files to PostgreSQL. JSON files remain for reference but are no longer read by the app.

## DATABASE_URL
The Replit-managed DATABASE_URL secret is used. Schema pushed via `pnpm --filter @workspace/db run push`.
