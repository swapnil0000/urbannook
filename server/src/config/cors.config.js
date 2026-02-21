function getAllowedOrigins() {
  const env = process.env.NODE_ENV || "development";
  const whitelistFromEnv = process.env.WHITE_LIST_CLIENT_URI || "";

  const origins = whitelistFromEnv
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (env === "development") {
    const localhostOrigins = [...origins];

    localhostOrigins.forEach((localhost) => {
      if (!origins.includes(localhost)) {
        origins.push(localhost);
      }
    });
  }

  return origins;
}

/**
 * CORS options configuration
 */
export const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();
    const env = process.env.NODE_ENV || "development";

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

      if (env === "production") {
        callback(new Error("Not allowed by CORS"));
      } else {
        // In development, be more lenient but still log the warning
        console.warn("   (Allowed in development mode)");
        callback(null, true);
      }
    }
  },
  credentials: true, // Allow cookies and authentication headers
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Set-Cookie"],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  maxAge: 86400, // Cache preflight requests for 24 hours
};

/**
 * Log CORS configuration on startup
 */
export function logCorsConfig() {
  const allowedOrigins = getAllowedOrigins();
  const env = process.env.NODE_ENV || "development";

  console.log("\n🔒 CORS Configuration:");
  console.log(`   Environment: ${env}`);
  console.log(`   Allowed Origins (${allowedOrigins.length}):`);
  allowedOrigins.forEach((origin) => console.log(`     - ${origin}`));
  console.log("");
}

export default corsOptions;
