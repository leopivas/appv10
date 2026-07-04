# Creatools

Real-time TikTok LIVE monitoring dashboard — view top live channels, monitor any creator's stream via WebSocket, and bulk-check live status for multiple accounts.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/creatools run dev` — run the frontend (port 18853)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 8080, path `/api`)
- Frontend: React + Vite + Tailwind v4 + shadcn/ui (path `/`)
- DB: None — all data proxied from tik.tools API
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for all API shapes)
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `lib/api-zod/src/generated/api.ts` — generated Zod schemas (used in backend validation)
- `artifacts/api-server/src/routes/` — Express route handlers (tiktok.ts, config.ts, health.ts)
- `artifacts/api-server/data/config.json` — persisted API key fallback (if env var not set)
- `artifacts/creatools/src/pages/` — React pages (dashboard, monitor, bulk-check, settings)
- `artifacts/creatools/src/components/layout/app-layout.tsx` — sidebar navigation layout

## Architecture decisions

- **No database**: All data is proxied from tik.tools in real-time; config (API key) persisted to `data/config.json` as fallback if `TIKTOOLS_API_KEY` env var not set.
- **Server-side API key**: Frontend never touches the API key directly. Backend mints JWT tokens for WebSocket connections and proxies all tik.tools calls.
- **WebSocket in frontend**: Monitor page opens `wss://api.tik.tools?uniqueId=...&jwtKey=...` directly from the browser after getting the JWT from the backend `/api/tiktok/jwt` endpoint. Auto-reconnects on drop.
- **Dark-only theme**: Colors defined directly on `:root` (no light/dark split). `html.dark` class set in `index.html`. Tailwind v4 custom variant: `@custom-variant dark (&:where(.dark, .dark *))`.
- **Contract-first API**: OpenAPI spec → Orval codegen → React Query hooks + Zod schemas. Run codegen after any spec change.

## Product

- **Dashboard** (`/`): Top live TikTok channels grid, viewer counts, quick monitor search
- **Monitor** (`/monitor/:username`): Real-time WebSocket event feed (chat, gifts, likes, joins, follows, shares), live stats bar, room info
- **Bulk Check** (`/bulk-check`): Paste list of usernames → live/offline grid with viewer counts
- **Settings** (`/settings`): API key management, tier info, rate limit display

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **Tailwind v4 dark mode**: Use `@custom-variant dark (&:where(.dark, .dark *))` (not the default `&:is(.dark *)`). The `.dark` class goes on `<html>` in `index.html`. Do NOT use `@apply dark` in CSS — it fails because `dark` is a variant, not a utility.
- **After spec changes**: Run `pnpm --filter @workspace/api-spec run codegen` before typechecking the frontend.
- tik.tools Sandbox tier: 20 API calls/window, 3 concurrent WebSockets, 10-min WS sessions.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- tik.tools API base: `https://api.tik.tools`, WebSocket: `wss://api.tik.tools`
