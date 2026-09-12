module.exports = {
  apps: [
    {
      name: "urbannook-server",
      script: "./pm2-entry.sh",
      interpreter: "bash",
      watch: false,

      env: {
        NODE_ENV: "development",
      },

      env_staging: {
        NODE_ENV: "staging",
      },

      // Production
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
