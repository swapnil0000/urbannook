import "./config/envConfigSetup.js";
import app from "./app.js";
import connDB from "./db/conn.js";
import {
  validateEnvironment,
  validateEnvironmentConfig,
} from "./config/validateEnv.js";
import env from "./config/envConfigSetup.js";

validateEnvironment();
validateEnvironmentConfig();

connDB()
  .then(() => {
    app.listen(env.PORT || 8000, () => {
      console.log(
        `[INFO] Server started  Port: ${env.PORT || 8000}, NodeEnv: ${env.NODE_ENV || "development"}`,
      );
    });
  })
  .catch((err) => {
    console.error(
      `[ERROR] Error while connecting to database:`,
      err.message,
      err.stack,
    );
    process.exit(1);
  });
