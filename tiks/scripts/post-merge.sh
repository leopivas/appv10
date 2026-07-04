#!/bin/bash
set -e
pnpm install --frozen-lockfile

DB_CONFIG="artifacts/api-server/data/db-config.json"
if [ -f "$DB_CONFIG" ]; then
  DB_URL=$(node -e "const d=JSON.parse(require('fs').readFileSync('$DB_CONFIG','utf8'));console.log(d.url||'')" 2>/dev/null || true)
fi

if [ -n "$DB_URL" ]; then
  export DATABASE_URL="$DB_URL"
fi

if [ -n "$DATABASE_URL" ]; then
  echo "Running schema push against: ${DATABASE_URL%%@*}@***"
  pnpm --filter db push || echo "Schema push failed (DB may be unreachable) — skipping"
else
  echo "No DATABASE_URL available — skipping schema push"
fi
