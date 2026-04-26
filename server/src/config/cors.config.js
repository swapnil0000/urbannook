import env from "./envConfigSetup.js";
// force-redeploy: x-csrf-token allowed

const getAllowedOrigins = () => {
  const whitelist = (env.WHITE_LIST_CLIENT_URI || "")
    .split(",")
    .map(origin => origin.trim().replace(/\/$/, ""));
  return whitelist;
};

export const corsOptions = {
  origin: (origin, callback) => {
    // 1. Allow non-browser requests (Postman, mobile)
    if (!origin) return callback(null, true);

    const allowedOrigins = getAllowedOrigins();
    const cleanOrigin = origin.replace(/\/$/, "");

    // 2. Allow if in explicit whitelist
    if (allowedOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }

    // 3. Allow any subdomains of urbannook.online or urbannook.in
    const isUrbanNookDomain = 
      cleanOrigin.includes("urbannook.online") || 
      cleanOrigin.endsWith("urbannook.online") ||
      cleanOrigin.includes("urbannook.in") ||
      cleanOrigin.endsWith("urbannook.in");

    if (isUrbanNookDomain || env.NODE_ENV === "development") {
      return callback(null, true);
    }

    // 4. Deny others
    callback(new Error(`CORS Error: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "X-CSRF-Token",
    "x-csrf-token",
    "X-XSRF-TOKEN",
    "x-xsrf-token",
    "X-Auth-Token"
  ],
  exposedHeaders: ["Set-Cookie", "X-CSRF-Token", "x-csrf-token"],
  optionsSuccessStatus: 204,
  preflightContinue: false
};

export function logCorsConfig() {
  console.log("🔒 CORS Whitelist:", getAllowedOrigins());
}

export default corsOptions;
