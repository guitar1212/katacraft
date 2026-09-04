#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Setting up .env files"
[ -f .env ] || cp .env.example .env
[ -f apps/api/.env ] || cp .env.example apps/api/.env

if [ -n "${CODESPACE_NAME:-}" ] && [ -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]; then
  WEB_URL="https://${CODESPACE_NAME}-5173.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
  API_URL="https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
  echo "==> Detected Codespaces — wiring forwarded URLs"
  echo "    web: $WEB_URL"
  echo "    api: $API_URL"

  # apps/api CORS: main.ts also auto-allows *.app.github.dev when CODESPACES=true,
  # this just keeps WEB_ORIGIN accurate for anything that reads it directly.
  if grep -q '^WEB_ORIGIN=' apps/api/.env; then
    sed -i "s#^WEB_ORIGIN=.*#WEB_ORIGIN=${WEB_URL}#" apps/api/.env
  else
    echo "WEB_ORIGIN=${WEB_URL}" >> apps/api/.env
  fi
  if grep -q '^WEB_ORIGIN=' .env; then
    sed -i "s#^WEB_ORIGIN=.*#WEB_ORIGIN=${WEB_URL}#" .env
  else
    echo "WEB_ORIGIN=${WEB_URL}" >> .env
  fi

  mkdir -p apps/web
  if [ -f apps/web/.env.example ] && [ ! -f apps/web/.env ]; then
    cp apps/web/.env.example apps/web/.env
  fi
  if [ -f apps/web/.env ]; then
    if grep -q '^VITE_API_BASE_URL=' apps/web/.env; then
      sed -i "s#^VITE_API_BASE_URL=.*#VITE_API_BASE_URL=${API_URL}#" apps/web/.env
    else
      echo "VITE_API_BASE_URL=${API_URL}" >> apps/web/.env
    fi
  else
    echo "VITE_API_BASE_URL=${API_URL}" > apps/web/.env
  fi
fi

echo "==> npm install (this can take a while)"
npm install

echo "==> Building @katacraft/shared"
npm run build -w packages/shared

echo "==> Generating Prisma client"
npm run prisma:generate -w apps/api

cat <<'EOF'

==> Done. Next steps:
  1. docker compose up -d          (starts automatically on container start too)
  2. npm run prisma:migrate -w apps/api
  3. npm run seed -w apps/api
  4. npm run dev -w apps/web       (in a separate terminal — forward port 5173)

Port 3000 (API) and 5173 (web) are forwarded and set to PUBLIC visibility so
the browser can reach the API cross-origin without a GitHub auth redirect.
That means anyone with the URL can reach them for as long as this Codespace
is running — fine for a throwaway seeded demo, not for real data.
EOF
