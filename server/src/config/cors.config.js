import env from "./envConfigSetup.js";
function getAllowedOrigins() {
  const whitelistFromEnv = env.WHITE_LIST_CLIENT_URI || "";

  const origins = whitelistFromEnv
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return origins;
}

/**
 * CORS options configuration
 */
export const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();
    const mode = env.NODE_ENV;
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in whitelist
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Log rejected origin for debugging
      console.warn(`⚠️  CORS: Rejected request from origin: ${origin}`);
      console.warn(`   Allowed origins: ${allowedOrigins.join(", ")}`);

      if (mode === "development") {
        console.warn("   (Allowed because NODE_ENV is development)");
        return callback(null, true);
      }
      console.error(`   ❌ Access Denied in ${mode} mode`);
      callback(
        new Error(`CORS Error: Origin ${origin} not allowed in ${mode} mode`),
      );
    }
  },
  credentials: true, // Allow cookies and authentication headers
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Accept-Language", "Origin", "X-CSRF-Token"],
  exposedHeaders: ["Set-Cookie"],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  maxAge: 86400, // Cache preflight requests for 24 hours
};

/**
 * Log CORS configuration on startup
 */
export function logCorsConfig() {
  const allowedOrigins = getAllowedOrigins();

  console.log("\n🔒 CORS Configuration:");
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(`   Allowed Origins (${allowedOrigins.length}):`);
  allowedOrigins.forEach((origin) => console.log(`     - ${origin}`));
  console.log("");
}

export default corsOptions;
