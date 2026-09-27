// Production pm2 config — used by the prod deploy only.
// Same app name as ecosystem.config.cjs, but starts through
// scripts/start-prod.sh, which loads secrets from Infisical (with a fallback
// to .env.production). Local/staging keep using ecosystem.config.cjs.
module.exports = {
  apps: [
    {
      name: "urbannook-server",
      script: "./scripts/start-prod.sh",
      interpreter: "bash",
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
