// Production pm2 config — used by the prod deploy only.
// Same app name as ecosystem.config.cjs, but starts through
// scripts/start-prod.sh, which loads secrets from Infisical (with a fallback
// to .env.production). Local/staging keep using ecosystem.config.cjs.
//
// Release layout (DEPLOYMENT_ARCHITECTURE.md §3): when this file lives inside
// releases/<N>, the app runs through the `current` symlink instead of the
// release folder. Node resolves __dirname to the real folder, so without this
// `pm2 restart` after moving `current` (rollback) would keep running the old
// release. Outside releases/ (old server/ folder) it behaves as before.
const path = require("path");

const BASE = "/home/ubuntu/urbannook-prod";
const inRelease = __dirname.startsWith(`${BASE}/releases/`);
const appDir = inRelease ? `${BASE}/current` : __dirname;

module.exports = {
  apps: [
    {
      name: "urbannook-server",
      script: path.join(appDir, "scripts/start-prod.sh"),
      interpreter: "bash",
      cwd: appDir,
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
