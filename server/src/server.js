import "./config/envConfigSetup.js";
import app from "./app.js";
import connDB from "./db/conn.js";
import { validateEnvironment, validateEnvironmentConfig } from "./config/validateEnv.js";

const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env";

// Validate environment variables before starting server
validateEnvironment();
validateEnvironmentConfig();

connDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`[INFO] Server started - Environment: ${envFile}, Port: ${process.env.PORT || 8000}, NodeEnv: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((err) => {
    console.error(`[ERROR] Error while connecting to database:`, err.message, err.stack);
    process.exit(1);
  });
