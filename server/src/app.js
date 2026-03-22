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
  igOrderRouter,
} from "./routes/index.js";
import cookieParser from "cookie-parser";
import healthRouter from "./routes/health.route.js";
import { corsOptions, logCorsConfig } from "./config/cors.config.js";
import { errorHandler } from "./middleware/errorHandler.middleware.js";
import { sanitizeRequestBody } from "./middleware/sanitization.middleware.js";
import env from "./config/envConfigSetup.js";


const app = express();
app.set("trust proxy", 1);
app.set("etag", false); // Disable ETags — prevents browser returning stale 304 for dynamic API responses

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
app.use(helmet({
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
        "'unsafe-eval'"    // Required for Razorpay
      ],
      
      // Styles: Allow own domain + Google Fonts + inline styles (for React)
      styleSrc: [
        "'self'",
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net",
        "'unsafe-inline'" // Required for inline styles in React
      ],
      
      // Images: Allow own domain + any HTTPS source (for product images)
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:"
      ],
      
      // API Connections: Allow own domain + Razorpay + Google
      connectSrc: [
        "'self'",
        "https://api.razorpay.com",
        "https://accounts.google.com",
        "https://apis.google.com",
        env.NODE_ENV === "development" ? "http://localhost:*" : "",
        env.NODE_ENV === "development" ? "ws://localhost:*" : "" // For Vite HMR
      ].filter(Boolean),
      
      // Fonts: Allow own domain + Google Fonts + CDN
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdn.jsdelivr.net",
        "data:"
      ],
      
      // Frames/iframes: Only allow Razorpay + Google
      frameSrc: [
        "https://api.razorpay.com",
        "https://accounts.google.com"
      ],
      
      // Object/Embed: Block all
      objectSrc: ["'none'"],
      
      // Base URI: Restrict to own domain
      baseUri: ["'self'"],
      
      // Form actions: Allow own domain + Razorpay
      formAction: [
        "'self'",
        "https://api.razorpay.com"
      ],
      
      // Frame ancestors: Prevent clickjacking
      frameAncestors: ["'none'"],
      
      // Upgrade insecure requests in production
      ...(env.NODE_ENV === "production" && {
        upgradeInsecureRequests: []
      })
    }
  },
  
  // HTTP Strict Transport Security - Force HTTPS
  hsts: {
    maxAge: 31536000,        // 1 year in seconds
    includeSubDomains: true, // Apply to all subdomains
    preload: true            // Submit to browser preload list
  },
  
  // Prevent clickjacking by disabling iframes
  frameguard: {
    action: 'deny'
  },
  
  // Prevent MIME-type sniffing
  noSniff: true,
  
  // Enable XSS filter in older browsers
  xssFilter: true,
  
  // Hide X-Powered-By header (don't reveal Express)
  hidePoweredBy: true,
  
  // Referrer Policy - Control referrer information
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  
  // Permissions Policy - Control browser features
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none'
  },
  
  // Cross-Origin-Opener-Policy - Allow Google OAuth popup
  crossOriginOpenerPolicy: {
    policy: env.NODE_ENV === "development" ? "unsafe-none" : "same-origin-allow-popups"
  }
}));

/* Health Route */
app.use("/health", healthRouter);
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

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
  igOrderRouter,
);

app.use(errorHandler);

export default app;
