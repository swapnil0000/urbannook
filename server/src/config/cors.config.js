import env from "./envConfigSetup.js";
function getAllowedOrigins() {
  const whitelistFromEnv = env.WHITE_LIST_CLIENT_URI || "";

  const origins = whitelistFromEnv
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, "")) // Remove trailing slash
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

    // Clean current origin for comparison
    const cleanOrigin = origin.replace(/\/$/, "");

    // Check if origin is in whitelist
    if (allowedOrigins.some(o => o === cleanOrigin)) {
      callback(null, true);
    } else if (
      cleanOrigin.endsWith(".urbannook.online") || 
      cleanOrigin.endsWith(".urbannook.in") ||
      cleanOrigin.endsWith("urbannook.online") ||
      cleanOrigin.endsWith("urbannook.in")
    ) {
      // Allow any urbannook subdomain in staging/production for better reliability
      callback(null, true);
    } else {
      // In non-production, log rejection for debugging
      if (mode !== "production") {
        console.warn(`[CORS DEBUG] Origin: ${origin}`);
        console.warn(`[CORS DEBUG] Allowed: ${allowedOrigins.join(", ")}`);
      }

      if (mode === "development") {
        return callback(null, true);
      }
      
      callback(
        new Error(`CORS Error: Origin ${origin} not allowed in ${mode} mode`),
      );
    }
  },
  credentials: true, // Allow cookies and authentication headers
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "x-requested-with",
    "Accept",
    "Accept-Language",
    "Origin",
    "X-CSRF-Token",
    "x-csrf-token",
    "X-XSRF-TOKEN",
    "x-xsrf-token"
  ],
  exposedHeaders: ["Set-Cookie", "X-CSRF-Token", "x-csrf-token"],
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
