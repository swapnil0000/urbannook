#!/usr/bin/env bash
# Production start script, run by pm2 (see ecosystem.prod.config.cjs).
#
# Loads the server's secrets from Infisical (project "Urabnnook - Env",
# env "prod", folder /user/server) using the prod-only, read-only machine
# identity `prod-ec2-reader`. Its Client ID/Secret live ONLY on the prod EC2
# in /home/ubuntu/.infisical-prod.env (chmod 600) — never in this repo.
#
# Fallback: if the Infisical login fails (Infisical down, bad credentials),
# the server starts the old way and reads .env.production via dotenv, so a
# secrets-service problem can't take the site down. Remove the fallback once
# .env.production is retired (see DEPLOYMENT_ARCHITECTURE.md).
set -uo pipefail

CRED_FILE="/home/ubuntu/.infisical-prod.env"
PROJECT_ID="80b13bde-6879-405e-889f-2f9b28f4c0f4"
INFISICAL_ENV="prod"
INFISICAL_PATH="/user/server"

cd "$(dirname "$0")/.."

start_with_env_file() {
  echo "[start-prod] WARNING: $1 — starting with .env.production instead of Infisical"
  exec node src/server.js
}

[ -r "$CRED_FILE" ] || start_with_env_file "credentials file $CRED_FILE missing"
command -v infisical >/dev/null 2>&1 || start_with_env_file "infisical CLI not installed"

set -a
# shellcheck disable=SC1090
. "$CRED_FILE"
set +a

TOKEN="$(infisical login --method=universal-auth \
  --client-id="${INFISICAL_CLIENT_ID:-}" \
  --client-secret="${INFISICAL_CLIENT_SECRET:-}" \
  --silent --plain 2>/dev/null)" || TOKEN=""
unset INFISICAL_CLIENT_ID INFISICAL_CLIENT_SECRET

[ -n "$TOKEN" ] || start_with_env_file "Infisical login failed"

echo "[start-prod] Starting with secrets from Infisical ($INFISICAL_ENV $INFISICAL_PATH)"
# Token goes through the environment (not argv) so it never shows up in `ps`,
# and is stripped before node starts so the app never sees it.
export INFISICAL_TOKEN="$TOKEN"
unset TOKEN
exec infisical run \
  --projectId="$PROJECT_ID" \
  --env="$INFISICAL_ENV" \
  --path="$INFISICAL_PATH" \
  -- env -u INFISICAL_TOKEN node src/server.js
