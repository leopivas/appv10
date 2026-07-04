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
### Nesta sessão (Jan 2026)
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
### P0 (usuário pediu — pendente)
- 🔲 Migrar usuários adicionais do `data/users.json` para o Postgres (só migrei admin@creatools.co e piva@piva.lol)
- 🔲 Popular tabelas `plans` e `roles` (usuário criará via admin panel ou pelo seed)
- 🔲 Melhorias em overlays / leaderboards (usuário reclamou; precisa detalhes específicos)
- 🔲 Features de bettertok.app + tikscan.live (usuário mencionou; precisa lista concreta)

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
