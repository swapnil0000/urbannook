module.exports = {
  apps: [
    {
      name: "urbannook-server",
      script: "./src/server.js",
      watch: false,

      // Local (default)
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
