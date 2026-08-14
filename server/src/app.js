// Server Version: 2.1.0 - Strict Variant & Image Logic Live
import express from "express";
import cors from "cors";
import helmet from "helmet";
import {
  userRouter,
  productRouter,
  commonRouter,
  userWaitListRouter,
  userAddressRouter,
  userCartRouter,
  userCommunityListRouter,
  userWishListRouter,
  couponCodeRouter,
  testimonialRouter,
  contactRouter,
  statsRouter,
  dynamicShippingRouter,
  eventRouter,
  catalogRouter,
  metaCapiRouter,
  adminAnalyticsRouter,
  freeShippingOfferRouter,
  cartRuleRouter,
  offerLeadRouter,
} from "./routes/index.js";
import cookieParser from "cookie-parser";
import healthRouter from "./routes/health.route.js";
import { corsOptions, logCorsConfig } from "./config/cors.config.js";
import { errorHandler } from "./middleware/errorHandler.middleware.js";
import { sanitizeRequestBody } from "./middleware/sanitization.middleware.js";
import env from "./config/envConfigSetup.js";

const app = express();

// HARDCODED DEPLOYMENT TRACKER
app.use((req, res, next) => {
  res.setHeader("X-Deployment-Status", "V2.1.0-STRICT-ACTIVE");
  next();
});

// Set essential app settings
app.set("trust proxy", 1);
app.set("etag", false);

// 1. HANDEL CORS (Must be the very first middleware)
app.use(cors(corsOptions));

// Log config on startup
logCorsConfig();

/* ===============================================================
   SECURITY HEADERS - Helmet.js Configuration
   ---------------------------------------------------------------
   Protects against:
   - XSS attacks
   - Clickjacking
   - MIME-type sniffing
   - Man-in-the-middle attacks
================================================================ */
app.use(
  helmet({
    // Content Security Policy - Controls what resources can load
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        // Scripts: Allow own domain + Razorpay + Google Sign-In
        scriptSrc: [
          "'self'",
          "https://checkout.razorpay.com",
          "https://accounts.google.com",
          "https://apis.google.com",
          "'unsafe-inline'", // Required for Razorpay inline scripts
          "'unsafe-eval'", // Required for Razorpay
        ],

        // Styles: Allow own domain + Google Fonts + inline styles (for React)
        styleSrc: [
          "'self'",
          "https://fonts.googleapis.com",
          "https://cdn.jsdelivr.net",
          "'unsafe-inline'", // Required for inline styles in React
        ],

        // Images: Allow own domain + any HTTPS source (for product images)
        imgSrc: ["'self'", "data:", "https:", "blob:"],

        // API Connections: Allow own domain + Razorpay + Google
        connectSrc: [
          "'self'",
          "https://api.razorpay.com",
          "https://accounts.google.com",
          "https://apis.google.com",
          "https://api-staging.urbannook.online",
          "https://api.urbannook.in",
          env.NODE_ENV === "development" ? "http://localhost:*" : "",
          env.NODE_ENV === "development" ? "ws://localhost:*" : "", // For Vite HMR
        ].filter(Boolean),

        // Fonts: Allow own domain + Google Fonts + CDN
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdn.jsdelivr.net",
          "data:",
        ],

        // Frames/iframes: Only allow Razorpay + Google
        frameSrc: ["https://api.razorpay.com", "https://accounts.google.com"],

        // Object/Embed: Block all
        objectSrc: ["'none'"],

        // Base URI: Restrict to own domain
        baseUri: ["'self'"],

        // Form actions: Allow own domain + Razorpay
        formAction: ["'self'", "https://api.razorpay.com"],

        // Frame ancestors: Prevent clickjacking
        frameAncestors: ["'none'"],

        // Upgrade insecure requests in production
        ...(env.NODE_ENV === "production" && {
          upgradeInsecureRequests: [],
        }),
      },
    },

    // HTTP Strict Transport Security - Force HTTPS
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true, // Apply to all subdomains
      preload: true, // Submit to browser preload list
    },

    // Prevent clickjacking by disabling iframes
    frameguard: {
      action: "deny",
    },

    // Prevent MIME-type sniffing
    noSniff: true,

    // Enable XSS filter in older browsers
    xssFilter: true,

    // Hide X-Powered-By header (don't reveal Express)
    hidePoweredBy: true,

    // Referrer Policy - Control referrer information
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },

    // Resource Policy - Allow cross-origin requests
    crossOriginResourcePolicy: { policy: "cross-origin" },
    
    // Opener Policy - Allow Google OAuth popup
    crossOriginOpenerPolicy: { 
        policy: env.NODE_ENV === "development" ? "unsafe-none" : "same-origin-allow-popups" 
    },

    // Permissions Policy - Control browser features
    permittedCrossDomainPolicies: {
      permittedPolicies: "none",
    },
  }),
);

/* Health Route */
app.use("/health", healthRouter);

/*Explicity for webhook because it requires rp webhook requires raw not json */
app.use("/api/v1", (req, res, next) => {
  if (req.originalUrl === "/api/v1/rp/webhook") {
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ===============================================================
   INPUT SANITIZATION - Global Protection
   ---------------------------------------------------------------
   Sanitizes all user input to prevent XSS attacks
   - Removes HTML tags from req.body, req.query, req.params
   - Preserves safe special characters
   - Runs BEFORE route handlers
   
   Protects:
   - User profile updates (name, bio, phone)
   - Address inputs (street, city, landmark)
   - Contact form submissions
   - All other user input fields
================================================================ */
app.use("/api/v1", sanitizeRequestBody);

app.use(
  "/api/v1",
  userRouter,
  productRouter,
  commonRouter,
  userWaitListRouter,
  userWishListRouter,
  userAddressRouter,
  userCartRouter,
  userCommunityListRouter,
  couponCodeRouter,
  testimonialRouter,
  contactRouter,
  statsRouter,
  dynamicShippingRouter,
  eventRouter,
  catalogRouter,
  metaCapiRouter,
  adminAnalyticsRouter,
  freeShippingOfferRouter,
  cartRuleRouter,
  offerLeadRouter,
);

// TEMP deploy-verification log — remove once cart-rules deploy is confirmed
// live on staging. Prints once at process boot so it's easy to grep PM2
// logs after a redeploy to confirm this build actually replaced the old one.
// console.log("[DEPLOY CHECK] cart-rules route mounted — build marker v1");

app.use(errorHandler);

export default app;
