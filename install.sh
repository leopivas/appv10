#!/usr/bin/env bash
# ============================================================================
#  Creatools — Bootstrap Installer
#  --------------------------------------------------------------------------
#  Instala todas as dependências e configura o app em um servidor Ubuntu/Debian
#  em um único comando. Após rodar, o app fica pronto e o wizard visual
#  fica disponível em:  http://<seu-ip>/installer
#
#  Uso:
#    bash install.sh                        # instala em /opt/creatools
#    APP_DIR=/srv/app bash install.sh       # customiza diretório
#    NON_INTERACTIVE=1 bash install.sh      # sem prompts (usa defaults)
#
#  Testado em: Ubuntu 22.04, Ubuntu 24.04, Debian 12
# ============================================================================
set -euo pipefail

# ─── Configuração ──────────────────────────────────────────────────────────
APP_DIR="${APP_DIR:-/opt/creatools}"
REPO_URL="${REPO_URL:-https://github.com/leopivas/appvCOR.git}"
NODE_VERSION="${NODE_VERSION:-20}"
DB_NAME="${DB_NAME:-creatools}"
DB_USER="${DB_USER:-creatools}"
DB_PASSWORD="${DB_PASSWORD:-}"
NON_INTERACTIVE="${NON_INTERACTIVE:-0}"
BACKEND_PORT="${BACKEND_PORT:-8001}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

# ─── Cores ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

log()   { echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC}  $1"; }
fatal() { echo -e "${RED}✗${NC} $1" >&2; exit 1; }
step()  { echo ""; echo -e "${BLUE}▶ $1${NC}"; echo "─────────────────────────────────────────────────────────────"; }

# ─── Checks iniciais ───────────────────────────────────────────────────────
[[ $EUID -eq 0 ]] || fatal "Rode como root: sudo bash install.sh"

if ! command -v apt-get &>/dev/null; then
  fatal "Distribuição não suportada. Este instalador é para Ubuntu/Debian."
fi

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           🎬 Creatools — Bootstrap Installer                 ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  Este script vai instalar e configurar automaticamente:      ║${NC}"
echo -e "${CYAN}║   • Node.js ${NODE_VERSION}                                                 ║${NC}"
echo -e "${CYAN}║   • Python 3.11 + venv                                       ║${NC}"
echo -e "${CYAN}║   • PostgreSQL                                               ║${NC}"
echo -e "${CYAN}║   • pnpm, yarn, supervisor, nginx                            ║${NC}"
echo -e "${CYAN}║   • Todas as dependências do app (pnpm + pip + yarn)         ║${NC}"
echo -e "${CYAN}║   • Build do backend Node + serviços supervisor              ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Diretório do app: $APP_DIR"
echo "  Repositório:      $REPO_URL"
echo "  Banco de dados:   postgres://$DB_USER@localhost/$DB_NAME"
echo ""

if [[ "$NON_INTERACTIVE" != "1" ]]; then
  read -r -p "Continuar? [Y/n] " ans
  [[ "${ans:-Y}" =~ ^[Yy]$ ]] || fatal "Cancelado."
fi

# ─── Gerar senha do DB se não informada ────────────────────────────────────
if [[ -z "$DB_PASSWORD" ]]; then
  DB_PASSWORD="$(openssl rand -base64 24 2>/dev/null | tr -d '/+=' | cut -c1-24 || echo "creatools_$(date +%s)")"
  ok "Senha do banco gerada automaticamente"
fi

JWT_SECRET="$(openssl rand -base64 48 2>/dev/null | tr -d '/+=' | cut -c1-48 || echo "jwt_$(date +%s)_secret")"

# ─── Passo 1: Pacotes de sistema ───────────────────────────────────────────
step "1/9 Atualizando sistema e instalando pacotes básicos"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
  curl wget git build-essential ca-certificates gnupg lsb-release \
  software-properties-common openssl supervisor nginx \
  python3 python3-pip python3-venv python3-dev \
  postgresql postgresql-contrib libpq-dev \
  || fatal "Falha ao instalar pacotes básicos"
ok "Pacotes básicos instalados"

# ─── Passo 2: Node.js ──────────────────────────────────────────────────────
step "2/9 Instalando Node.js ${NODE_VERSION}"
if command -v node &>/dev/null && node --version | grep -q "v${NODE_VERSION}"; then
  ok "Node.js $(node --version) já instalado"
else
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash - >/dev/null 2>&1
  apt-get install -y -qq nodejs || fatal "Falha ao instalar Node.js"
  ok "Node.js $(node --version) instalado"
fi

# ─── Passo 3: pnpm + yarn ──────────────────────────────────────────────────
step "3/9 Instalando pnpm e yarn"
npm install -g corepack pnpm@9.15.9 yarn --silent 2>&1 | tail -3 || warn "Aviso na instalação de pnpm/yarn"
corepack enable 2>/dev/null || true
ok "pnpm $(pnpm --version 2>/dev/null || echo '?') e yarn $(yarn --version 2>/dev/null || echo '?') prontos"

# ─── Passo 4: PostgreSQL — criar banco + usuário ───────────────────────────
step "4/9 Configurando PostgreSQL"
systemctl enable postgresql --now >/dev/null 2>&1
sleep 2

# Cria user e DB se não existirem (idempotente)
sudo -u postgres psql <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';
  ELSE
    ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;
SQL

if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "${DB_NAME}"; then
  sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"
  ok "Banco '${DB_NAME}' criado"
else
  ok "Banco '${DB_NAME}' já existia"
fi
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" >/dev/null

# ─── Passo 5: Clonar/atualizar o repo ──────────────────────────────────────
step "5/9 Baixando o código do app"
if [[ -d "$APP_DIR/.git" ]]; then
  cd "$APP_DIR" && git pull --ff-only 2>&1 | tail -3 || warn "git pull falhou (talvez alterações locais)"
  ok "Código atualizado em $APP_DIR"
elif [[ -d "$APP_DIR" ]] && [[ -f "$APP_DIR/tiks/package.json" ]]; then
  ok "Código já existe em $APP_DIR (não é git — mantido)"
else
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --depth=1 "$REPO_URL" "$APP_DIR" 2>&1 | tail -3 || fatal "Falha no git clone"
  ok "Código clonado em $APP_DIR"
fi
cd "$APP_DIR"

# ─── Passo 6: Dependências Python ──────────────────────────────────────────
step "6/9 Instalando dependências Python"
python3 -m venv /root/.venv-creatools 2>/dev/null || true
# shellcheck disable=SC1091
source /root/.venv-creatools/bin/activate
pip install --upgrade pip --quiet
pip install -r "$APP_DIR/backend/requirements.txt" --quiet
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ --quiet 2>&1 | tail -3 || warn "emergentintegrations opcional falhou"
deactivate
ok "Dependências Python instaladas em /root/.venv-creatools"

# ─── Passo 7: Dependências Node ────────────────────────────────────────────
step "7/9 Instalando dependências Node (pnpm workspace + yarn launcher)"
cd "$APP_DIR/tiks"
pnpm install --prefer-offline 2>&1 | tail -5 || fatal "pnpm install falhou"
ok "Workspace pnpm instalado"

cd "$APP_DIR/frontend"
yarn install --silent 2>&1 | tail -3 || warn "yarn install teve avisos"
ok "Launcher frontend instalado"

# ─── Passo 8: Build do api-server ──────────────────────────────────────────
step "8/9 Compilando api-server (Node/esbuild)"
cd "$APP_DIR/tiks/artifacts/api-server"
pnpm run build 2>&1 | tail -5 || fatal "Build do api-server falhou"
ok "api-server compilado em dist/index.mjs"

# ─── Passo 9: Escrever .env, supervisor e iniciar ──────────────────────────
step "9/9 Configurando .env, supervisor e serviços"

# .env do backend
cat > "$APP_DIR/backend/.env" <<ENV
# Gerado automaticamente por install.sh em $(date -Iseconds)
DATABASE_URL=postgres://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}
JWT_SECRET=${JWT_SECRET}
NODE_ENV=production
LOG_LEVEL=info
APP_URL=http://localhost:${FRONTEND_PORT}

# Preencha depois via /installer:
# TIKTOOLS_API_KEY=
# EMERGENT_LLM_KEY=
# STRIPE_SECRET_KEY=
# STRIPE_WEBHOOK_SECRET=
# TIKTOK_CLIENT_KEY=
# TIKTOK_CLIENT_SECRET=
# TIKTOK_REDIRECT_URI=
ENV
chmod 600 "$APP_DIR/backend/.env"

# .env do frontend
cat > "$APP_DIR/frontend/.env" <<ENV
REACT_APP_BACKEND_URL=http://localhost:${BACKEND_PORT}
ENV

ok "Arquivos .env gerados"

# Supervisor config
cat > /etc/supervisor/conf.d/creatools.conf <<SUP
[program:creatools-backend]
command=/root/.venv-creatools/bin/uvicorn server:app --host 0.0.0.0 --port ${BACKEND_PORT} --workers 1
directory=${APP_DIR}/backend
environment=PATH="/root/.venv-creatools/bin:%(ENV_PATH)s"
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
stderr_logfile=/var/log/creatools-backend.err.log
stdout_logfile=/var/log/creatools-backend.out.log

[program:creatools-frontend]
command=/usr/bin/yarn start
directory=${APP_DIR}/frontend
environment=HOST="0.0.0.0",PORT="${FRONTEND_PORT}",PATH="/usr/bin:%(ENV_PATH)s"
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
stderr_logfile=/var/log/creatools-frontend.err.log
stdout_logfile=/var/log/creatools-frontend.out.log
SUP

# Nginx reverse proxy (porta 80 → 3000, /api → 8001)
cat > /etc/nginx/sites-available/creatools <<NGX
server {
    listen 80 default_server;
    server_name _;
    client_max_body_size 100M;

    location /api/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 300s;
    }

    location / {
        proxy_pass http://127.0.0.1:${FRONTEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
NGX

ln -sf /etc/nginx/sites-available/creatools /etc/nginx/sites-enabled/creatools
rm -f /etc/nginx/sites-enabled/default
nginx -t >/dev/null 2>&1 && systemctl reload nginx || warn "nginx: check config"

# Sobe serviços
supervisorctl reread >/dev/null 2>&1
supervisorctl update >/dev/null 2>&1
supervisorctl restart creatools-backend creatools-frontend 2>&1 | tail -3 || true
sleep 5

# ─── Resumo final ──────────────────────────────────────────────────────────
IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
IP="${IP:-localhost}"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           ✅  INSTALAÇÃO CONCLUÍDA COM SUCESSO!              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${CYAN}🌐 Acesse o wizard para finalizar a configuração:${NC}"
echo -e "     ${YELLOW}http://${IP}/installer${NC}"
echo ""
echo -e "  ${CYAN}🔑 Credenciais do banco de dados (guarde!):${NC}"
echo -e "     User:     ${DB_USER}"
echo -e "     Password: ${DB_PASSWORD}"
echo -e "     Database: ${DB_NAME}"
echo -e "     URL:      postgres://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
echo ""
echo -e "  ${CYAN}📁 Arquivos importantes:${NC}"
echo -e "     App:        ${APP_DIR}"
echo -e "     Backend env: ${APP_DIR}/backend/.env"
echo -e "     Logs:       /var/log/creatools-*.log"
echo ""
echo -e "  ${CYAN}⚙️  Comandos úteis:${NC}"
echo -e "     supervisorctl status                 # ver status"
echo -e "     supervisorctl restart creatools-backend"
echo -e "     tail -f /var/log/creatools-backend.err.log"
echo ""
echo -e "  ${CYAN}🎯 Próximos passos:${NC}"
echo -e "     1. Acesse ${YELLOW}http://${IP}/installer${NC} no navegador"
echo -e "     2. Complete o wizard (chave tik.tools + admin + IA opcional)"
echo -e "     3. Faça login e use o app!"
echo ""
