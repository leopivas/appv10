# Creatools — Product Requirements Document

## Original Problem Statement
All-in-one TikTok Live toolkit for Brazilian streamers. Feature parity with bettertok.app / tikscan.live plus AI features (Claude + Sora 2). PT-BR primary language.

## Architecture (Feb 2026)
- **Backend proxy (Python)**: FastAPI at `:8001` (supervisor `backend`) — loads `EMERGENT_LLM_KEY` + `TIKTOOLS_API_KEY` from `/app/backend/.env`. Native routes: `/api/ai/*` (Claude + Sora + Object Storage). Proxies everything else to Node.
- **Node backend**: Express (TypeScript ESM) at `:8081` — main REST API (auth, plans, tiktok, overlays, events, layouts).
- **Frontend**: Vite + React (TypeScript) at `:3000` (supervisor `frontend`) — monorepo `/app/tiks/artifacts/creatools`.
- **DB**: PostgreSQL 15 + Drizzle ORM.

## Completed (chronological)
- 2026-02-07 Fase 1 · Overlay Studio with dual vertical/horizontal preview + `?demo=1` demo mode.
- 2026-02-07 Env fixes · PostgreSQL install, Vite proxy → 127.0.0.1:8081, frontend launcher fix.
- 2026-02-07 Fase 3 · Granular plan limits (`maxLiveHoursPerDay`, `maxActiveOverlays`, etc.) + admin editor + public `GET /api/plans`.
- 2026-02-07 TikTok verify bug fix · uses TikTok's PUBLIC oEmbed API primary; tik.tools fallback. Real user data confirmed (mrbeast 129M, charlidamelio 159M).
- 2026-02-07 Fase 4 · AI Assistant (Claude Sonnet 4.5 streaming SSE) + AI Video Generator (Sora 2 → Emergent Object Storage) + plan enforcement + sidebar entry.
- 2026-02-07 tik.tools quota preservation:
  - Disabled all watchlist / monitor / dashboard auto-polling.
  - Auto-connect on /monitor/:username gated by `plan.autoLiveMonitoring` + user's OWN linked TikTok handle.
  - New `autoLiveMonitoring` boolean column on plans (free=false, basic/pro=true).
  - Backend profile public endpoint no longer calls tik.tools.
  - Landing page `bulkLiveCheck` disabled.
  - `/tiktok/gifters/top` short-circuits (404 upstream).
  - `/live-counts` refetchInterval removed.
  - Deprecated /monitor/example demo link removed.
- 2026-02-07 Sidebar overhaul · Reset ui-config, added Inteligência Artificial section (Assistente IA + Vídeos IA), Alertas Sonoros, Eventos & Ações, Layout OBS, Dev Tools, updated Conexão → /streamer/lookup.
- 2026-02-07 Scoreboards enhancement · themes (neon/gold/dark/minimal), title/topN persistence, public overlay URL generator at `/overlay/scoreboard/:username?theme=X&layout=vertical|horizontal&top=N&title=X`.

## Backlog (Prioritized)
### P1
- Persist AI chat/video usage counters to Postgres (currently in-memory dict).
- Persist AI video registry to Postgres so records survive backend restart.
- Migrate Scoreboards preset system to server-side (per-user presets).
- Full page redesign of Minigames + Leaderboards with dual preview.

### P2
- Sound Alerts / TTS Tester with 100+ voices (ElevenLabs / OpenAI TTS integration).
- VIP Tracker dashboard (top gifters over 7d/30d).
- Trade Calculator (gift value estimator).
- Actions & Events polish (17+ triggers × 7+ actions).
- Spotify song requests (OAuth + queue overlay).

### P3
- Discord bot integration.
- Chrome extension.
- Desktop app (Electron/Tauri).
- Elgato Stream Deck plugin.

## Integrations Active
- **Emergent Universal Key** (`sk-emergent-58aE90c0611153c902` in `/app/backend/.env`)
  - Claude Sonnet 4.5 for chat (`anthropic/claude-sonnet-4-5-20250929`)
  - Sora 2 video generation (`sora-2`, `sora-2-pro`)
  - Emergent Object Storage (`creatools/ai-videos/{user_id}/{uuid}.mp4`)
- **Stripe** (test key `sk_test_emergent`)
- **tik.tools** (`tk_dc6acbf11dcaca519aeded1c794bf0b2eb41ee13bad540b5` — free tier; used only for on-demand user actions)
- **TikTok oEmbed** (public API, no key required)

## Test Credentials
See `/app/memory/test_credentials.md` (admin@creatools.co / admin123, plan=pro, tiktokUsername=_dantas02).

## Testing Reports
- iteration_1..4: full pass (all Overlay Studio, TikTok verify, granular plans, AI features, auto-connect disable).
- iteration_5 (in progress): sidebar overhaul + full auto-connect removal validation.

## Key Files
- `/app/backend/ai_router.py`, `/app/backend/server.py`
- `/app/tiks/artifacts/api-server/src/routes/{tiktok,profile,landing,plans}.ts`
- `/app/tiks/artifacts/api-server/src/lib/{plans-store,ui-config-store}.ts`
- `/app/tiks/lib/db/src/schema/{plans,users}.ts`
- `/app/tiks/artifacts/creatools/src/pages/{ai-assistant,ai-videos,monitor,scoreboards,overlay-scoreboard,live-counts}.tsx`
- `/app/tiks/artifacts/creatools/src/context/watchlist-context.tsx`
- `/app/tiks/artifacts/creatools/src/components/layout/app-layout.tsx`
