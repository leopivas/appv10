# ⚡ Instalação Rápida em VPS (1 comando)

Este documento é o **guia express** para instalar o Creatools em um VPS/servidor próprio (Ubuntu/Debian). Para documentação completa, veja [README.md](./README.md).

---

## 🎯 Um comando para instalar tudo

Em um servidor **Ubuntu 22.04+** ou **Debian 12+** recém-criado, rode como **root**:

```bash
curl -fsSL https://raw.githubusercontent.com/leopivas/APPFINALV3/main/install.sh | sudo bash
```

Ou, se já tiver o repositório clonado:

```bash
sudo bash install.sh
```

Isso vai automaticamente instalar e configurar **tudo** (Node, Python, PostgreSQL, dependências, build, supervisor, nginx). Duração: **~5-10 minutos**.

---

## 📋 O que o script faz (9 passos)

| Passo | Ação |
|---|---|
| 1️⃣ | Atualiza sistema + instala pacotes básicos (git, curl, build tools, nginx, supervisor) |
| 2️⃣ | Instala **Node.js 20** via NodeSource |
| 3️⃣ | Instala **pnpm 9** + **yarn** globalmente |
| 4️⃣ | Instala **PostgreSQL** + cria usuário e banco (`creatools`) com senha aleatória segura |
| 5️⃣ | Clona (ou atualiza) o código em `/opt/creatools` |
| 6️⃣ | Cria virtualenv Python em `/root/.venv-creatools` + instala `requirements.txt` + `emergentintegrations` |
| 7️⃣ | Roda `pnpm install` no workspace + `yarn install` no launcher |
| 8️⃣ | Compila o api-server (esbuild → `dist/index.mjs`) |
| 9️⃣ | Escreve `.env` com credenciais do DB + JWT_SECRET aleatório, configura supervisor + nginx (porta 80), sobe serviços |

Ao final, você recebe:

```
✅  INSTALAÇÃO CONCLUÍDA COM SUCESSO!

  🌐 Acesse o wizard para finalizar a configuração:
     http://<seu-ip>/installer

  🔑 Credenciais do banco de dados (guarde!):
     User:     creatools
     Password: <gerada-automaticamente>
     Database: creatools
```

---

## 🎛️ Customização (variáveis de ambiente)

O script aceita variáveis para customizar a instalação:

```bash
# Diretório customizado
APP_DIR=/srv/creatools sudo bash install.sh

# Sem prompts interativos (para automação)
NON_INTERACTIVE=1 sudo bash install.sh

# Customizar tudo
APP_DIR=/opt/meu-app \
DB_NAME=meuapp \
DB_USER=meuuser \
DB_PASSWORD=minha-senha-forte \
NODE_VERSION=20 \
BACKEND_PORT=8001 \
FRONTEND_PORT=3000 \
REPO_URL=https://github.com/leopivas/APPFINALV3.git \
sudo bash install.sh
```

| Variável | Padrão | Descrição |
|---|---|---|
| `APP_DIR` | `/opt/creatools` | Diretório onde o app será instalado |
| `REPO_URL` | `https://github.com/leopivas/APPFINALV3.git` | URL do repositório Git |
| `NODE_VERSION` | `20` | Versão do Node.js |
| `DB_NAME` | `creatools` | Nome do banco PostgreSQL |
| `DB_USER` | `creatools` | Usuário do PostgreSQL |
| `DB_PASSWORD` | *(gerada)* | Senha (se vazio, gera aleatória) |
| `BACKEND_PORT` | `8001` | Porta do FastAPI |
| `FRONTEND_PORT` | `3000` | Porta do Vite |
| `NON_INTERACTIVE` | `0` | `1` = pula prompts |

---

## 🧙 Depois do script — Wizard visual

Após o script terminar, acesse `http://<ip-do-servidor>/installer` no navegador para completar a configuração:

1. **Boas-vindas**
2. **Banco de Dados** — já vem pré-configurado (só clicar em Próximo)
3. **Conta Admin** — criar seu usuário admin
4. **API tik.tools** — colar sua chave (obrigatório)
5. **IA (opcional)** — colar `EMERGENT_LLM_KEY` para Claude + Sora
6. **API Alternativa** (opcional)
7. **Stripe** (opcional) — para monetização
8. **Concluído** — login automático como admin

Todas as chaves configuradas no wizard são gravadas em `/opt/creatools/backend/.env` e um arquivo `.installed` é criado para bloquear reinstalação.

---

## 🔧 Comandos úteis pós-instalação

### Status dos serviços

```bash
sudo supervisorctl status
```

Deve mostrar `creatools-backend` e `creatools-frontend` como **RUNNING**.

### Reiniciar

```bash
sudo supervisorctl restart creatools-backend
sudo supervisorctl restart creatools-frontend
sudo supervisorctl restart all
```

### Ver logs

```bash
# Erros do backend
sudo tail -f /var/log/creatools-backend.err.log

# Saída do frontend
sudo tail -f /var/log/creatools-frontend.out.log
```

### Reinstalar o wizard (do zero)

```bash
sudo rm /opt/creatools/tiks/artifacts/api-server/data/.installed
sudo supervisorctl restart creatools-backend
# Agora acesse /installer de novo
```

### Atualizar o código

```bash
cd /opt/creatools
sudo git pull
cd tiks && sudo pnpm install && cd artifacts/api-server && sudo pnpm run build
sudo supervisorctl restart creatools-backend creatools-frontend
```

---

## 🌐 Configurar domínio + HTTPS grátis

Depois que o app estiver rodando, aponte o DNS do seu domínio para o IP do servidor (registro A), e rode:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```

O certbot detecta o nginx, atualiza a config e instala certificado SSL grátis automaticamente. Renovação também é automática.

---

## 🐛 Troubleshooting

### O script parou no meio

Ele é **idempotente** — pode rodar de novo com segurança:

```bash
sudo bash install.sh
```

Passos já concluídos são detectados e pulados.

### `supervisorctl status` mostra FATAL/BACKOFF

Veja os logs:

```bash
sudo tail -50 /var/log/creatools-backend.err.log
sudo tail -50 /var/log/creatools-frontend.err.log
```

Erros comuns:
- **`ECONNREFUSED :5432`** → PostgreSQL não está rodando → `sudo systemctl start postgresql`
- **`ENOENT dist/index.mjs`** → build do api-server falhou → `cd /opt/creatools/tiks/artifacts/api-server && sudo pnpm run build`
- **`Node health check timed out`** → veja `.err.log` para o erro real do Node

### Nginx 502 Bad Gateway

Frontend ou backend não estão rodando. Verifique:

```bash
sudo supervisorctl status
curl http://localhost:8001/api/setup/status
curl http://localhost:3000
```

### Quero desinstalar completamente

```bash
sudo supervisorctl stop creatools-backend creatools-frontend
sudo rm /etc/supervisor/conf.d/creatools.conf
sudo rm /etc/nginx/sites-enabled/creatools /etc/nginx/sites-available/creatools
sudo systemctl reload nginx
sudo -u postgres dropdb creatools
sudo -u postgres dropuser creatools
sudo rm -rf /opt/creatools /root/.venv-creatools
sudo supervisorctl reread && sudo supervisorctl update
```

---

## 💡 Requisitos mínimos do servidor

- **CPU**: 2 vCPU
- **RAM**: 4 GB (2 GB é limite mínimo, mas apertado no build)
- **Disco**: 20 GB SSD
- **OS**: Ubuntu 22.04 LTS ou Debian 12 (recomendado)
- **Rede**: portas 80 (HTTP) e 443 (HTTPS) abertas — 22 (SSH) para acesso

Testado em: DigitalOcean, Linode, Vultr, AWS EC2 (t3.small+), Hetzner Cloud.

---

## 📞 Suporte

- Issues do app: https://github.com/leopivas/APPFINALV3/issues
- Documentação completa: [README.md](./README.md)
