#!/bin/bash
# PM2 entry point — injects secrets live from Infisical (no .env file on disk).
# Requires INFISICAL_UNIVERSAL_AUTH_CLIENT_ID / INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET
# to be set as real system env vars on this machine (see server/scripts/README-env-sync.md).
set -e
NODE_MODE="${NODE_ENV:-development}"
case "$NODE_MODE" in
  development) INFISICAL_ENV="dev" ;;
  production) INFISICAL_ENV="prod" ;;
  *) INFISICAL_ENV="$NODE_MODE" ;;
esac
exec infisical run --env="$INFISICAL_ENV" --path=/user/server -- node src/server.js
