# Creatools — PRD (Product Requirements Document)

## Problem Statement (original)
Usuário quer arrumar erros e adicionar funções ao sistema Creatools (ferramentas para streamers TikTok Live). Pediu também:
1. Interface web para gerenciar servidores/emuladores (ligar e desligar processos remotos)
2. Acesso restrito a admin master
3. Rodar preview público no Emergent
4. Features inspiradas em bettertok.app e tikscan.live

## Arquitetura
- **Monorepo pnpm** em `/app/tiks` (código fonte real)
- **Frontend**: React 19 + Vite 7 + Tailwind v4 + shadcn/ui + wouter — porta 3000
- **API**: Express 5 + Drizzle ORM + PostgreSQL — porta 8081 (spawned)
- **FastAPI proxy** (`/app/backend/server.py`): supervisor roda na 8001, spawna o Node backend na 8081 e proxya `/api/*`
- **DB**: PostgreSQL 15 local (`creatools`/`creatools`)
- **Agent**: script Python (`/app/tiks/artifacts/creatools/public/agent.py`) que o usuário instala na VPS

## Personas
- **Admin master (Creatools DONO)**: gerencia servidores, usuários, plans, landing, atendimento
- **Streamer TikTok**: usa overlays, monitor, watchlist, leaderboards
- **Gifter/Espectador**: perfis públicos de streamer

## Features Implementadas
### FASE 1 — Overlay Studio (Fev 2026) ✅
- ✅ **Novo Overlay Studio** (`/overlays`) — layout moderno com sidebar de controles + canvas central de preview
- ✅ **Canvas preview ao vivo**: iframe embutido mostrando o overlay real; muda instantaneamente ao alterar controles
- ✅ **Toggle Vertical (9:16 TikTok) / Horizontal (16:9)** — vertical é o default (mobile TikTok)
- ✅ **Modo Demo (`?demo=1`)**: dispara eventos falsos (gifts, likes, follows, subs, chat) para testar sem estar em live. Toggle na toolbar.
- ✅ Suporte a `?demo=1` implementado em TODOS os overlays: alerts, combo, top-gifters, stats, goal, subscribe, chat, ticker, obs-overlay (basic)
- ✅ Helper `useOverlayDemo` em `/app/tiks/artifacts/creatools/src/lib/overlay-demo.ts` gera 40+ tipos de eventos falsos com pesos realísticos
- ✅ URL de export (sem `?demo=1`) exibida separadamente para copiar para OBS/TikTok Studio
- ✅ Padrão xadrez no canvas + label "LIVE PREVIEW" para deixar claro que é preview

### Base (Jan 2026)
- ✅ Migração completa do monorepo `Tik-Tools-Deploy-1-tiks` para `/app/tiks`
- ✅ PostgreSQL local + drizzle push (schema atual + 3 tabelas novas: `servers`, `server_emulators`, `server_commands`)
- ✅ FastAPI proxy (`/app/backend/server.py`) spawna Node backend e forwarda `/api/*`
- ✅ Frontend launcher em `/app/frontend/package.json` roda Vite do monorepo na porta 3000
- ✅ **Nova página `/servers` (Servidores & Emuladores)** — admin only:
  - Listar / criar / editar / deletar servidores remotos
  - Criar "emuladores" (processos remotos com comando + cwd)
  - Enviar comandos start/stop/restart/logs
  - Ver status (online/offline/CPU/RAM), PID, últimos logs
  - Rotacionar / revelar chave do agent
- ✅ **Endpoints Agent** (`/api/agent/poll`, `/api/agent/commands/:id/result`) — auth via `X-Agent-Key`
- ✅ **Script agent Python** servido publicamente em `/agent.py` — o usuário roda na sua VPS
- ✅ Menu lateral: novo item "Servidores" (só aparece para admins)
- ✅ Marcação automática de offline (heartbeat > 45s)

### Já existiam no código original
- Auth (email/senha + TikTok OAuth), roles, plans, stripe, admin panel
- ~70 páginas React: dashboard, monitor, overlays, minigames, atendimento, gifters
- Integração com tik.tools (top-channels, WebSocket JWT, bulk-check, gift catalog)

## Endpoints novos
```
GET    /api/servers                            (admin)
POST   /api/servers                            (admin)  → cria + retorna agentKey
PATCH  /api/servers/:id                        (admin)
DELETE /api/servers/:id                        (admin)
GET    /api/servers/:id/agent-key              (admin)
POST   /api/servers/:id/rotate-key             (admin)
POST   /api/servers/:id/emulators              (admin)
PATCH  /api/servers/:id/emulators/:emuId       (admin)
DELETE /api/servers/:id/emulators/:emuId       (admin)
POST   /api/servers/:id/commands               (admin)
GET    /api/servers/:id/commands               (admin)
GET    /api/servers/:id/emulators/:emuId/logs  (admin)

POST   /api/agent/poll                         (X-Agent-Key)  — heartbeat + fetch commands
POST   /api/agent/commands/:cmdId/result       (X-Agent-Key)
```

## Backlog / Próximos passos
### FASES CONFIRMADAS PELO USUÁRIO (Fev 2026)
Ordem: 1 → 2 → 3 → 4 → 5 → 6 → 7. IA via Claude Sonnet 4.5 + Sora 2 + BytePlus (extensível). Storage: Object storage Emergent.

- 🟢 FASE 1: Novo Overlay Studio com preview vertical + demo mode — **FEITO**
- 🔲 FASE 2 (P0): Scoreboards & Leaderboards com modo demo, redesign visual, preview
- 🔲 FASE 3 (P1): Controle total de planos — `maxLiveHoursPerDay`, `maxAiRequestsPerMonth`, `maxAiVideosPerMonth`, `maxOverlaysActive`, etc. + override individual + UI matriz completa + tracking de uso
- 🔲 FASE 4 (P1): AI Assistente (Claude Sonnet 4.5) + AI Vídeos transparentes (Sora 2 + BytePlus) + Object storage
- 🔲 FASE 5 (P2): Redesign massivo de páginas (minigames, funções, etc.) inspirado em bettertok.app/tikscan.live
- 🔲 FASE 6 (P2): Agendamento de lives, alertas, multi-conta, relatórios
- 🔲 FASE 7 (P3): Fix Servers Manager + polimentos

### Ambiente re-provisionado nesta sessão
- ✅ PostgreSQL 15 instalado + user/db `creatools` criados
- ✅ pnpm 9 instalado (`/usr/bin/pnpm`)
- ✅ Schema aplicado (`pnpm push` em `/app/tiks/lib/db`) — 13 tabelas
- ✅ Admin master `admin@creatools.co` / `admin123` reseeded
- ✅ Plans (free/basic/pro) reseeded

### P1
- 🔲 Página `/servers` : abrir modal com logs full-screen (hoje só mostra os últimos ~200 linhas inline)
- 🔲 Auto-start dos emuladores marcados com `autoStart: true`
- 🔲 Notificações in-app quando emulador crashar
- 🔲 Métricas históricas (chart de CPU/RAM 24h)
- 🔲 Multi-agent no mesmo server (hoje 1 agent = 1 server)

### P2
- 🔲 Roles de "admin master" separado de admin comum (hoje qualquer admin acessa /servers)
- 🔲 API pública de webhooks quando emulador muda de estado
- 🔲 Deploy de scripts pre-built via painel (npm install/pull git etc.)

## Credenciais de teste
Ver `/app/memory/test_credentials.md`

## Como rodar o agent (guia usuário)
Na VPS (Windows/Linux):
```bash
curl -O https://<seu-panel>/agent.py
pip3 install requests psutil
export CREATOOLS_AGENT_KEY="srvk_..."   # obtido do painel ao criar servidor
export CREATOOLS_PANEL_URL="https://<seu-panel>"
python3 agent.py
```
