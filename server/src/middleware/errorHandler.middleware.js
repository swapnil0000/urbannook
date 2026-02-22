import sendAlert from "../utils/alertSystem.js";

/**
 * Global Error Handler Middleware
 * This is the final error handler - it catches all errors and sends response
 * Note: 'next' parameter is required by Express.js error handler signature (err, req, res, next)
 * but not used since this is the terminal error handler
 */
export const errorHandler = async (err, req, res, next) => {
  // Debug log
  console.log("=== ERROR HANDLER TRIGGERED ===");
  console.log("err.statusCode:", err.statusCode);
  console.log("err.name:", err.name);
  console.log("err.constructor.name:", err.constructor.name);
  console.log("err.message:", err.message);
  console.log("typeof err.statusCode:", typeof err.statusCode);
  console.log("===========================");

  // Log error with context
  console.error(
    `[ERROR] Request error - Method: ${req.method}, URL: ${req.url}, UserId: ${req.user?.userId || "N/A"}, StatusCode: ${err.statusCode || 500}:`,
    err.message,
  );

  // Determine status code
  const statusCode = err.statusCode || 500;

  // Send alert for 500 errors (both local and production)
  if (statusCode === 500) {
    console.log("[INFO] 500 error detected, sending alert to Zoho...");

    // Get user details from request (if authenticated)
    const isAuthenticated = req.user && req.user.userId;
    const userId = isAuthenticated ? req.user.userId : "Not Authenticated";
    const userEmail = isAuthenticated ? req.user.userEmail : "N/A";
    const userName = isAuthenticated ? req.user.userName : "N/A";
    
    // Get timestamp in IST (compact format)
    const now = new Date();
    const timestamp = now.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    // Get IP address (handle both IPv4 and IPv6)
    let ipAddress = req.ip || 
                    req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                    req.socket?.remoteAddress || 
                    req.connection?.remoteAddress || 
                    "Unknown";
    
    // Convert IPv6 localhost to readable format
    if (ipAddress === "::1" || ipAddress === "::ffff:127.0.0.1") {
      ipAddress = "localhost";
    }

    // Create detailed alert message with Zoho Cliq formatting
    const alertMessage = `🚨 **500 INTERNAL SERVER ERROR**

**Env:** ${process.env.NODE_ENV || "development"} | **Time:** ${timestamp}

**Request:** ${req.method} \`${req.url}\` | **IP:** ${ipAddress}

**User:** ${userId} | **Email:** ${userEmail} | **Name:** ${userName}

**Error:** ${err.name || "Error"} - ${err.message}
${process.env.NODE_ENV !== "production" ? `
**Stack:**
\`\`\`
${err.stack?.split("\n").slice(0, 5).join("\n") || "N/A"}
\`\`\`` : ""}${req.body && Object.keys(req.body).length > 0 ? `

**Body:**
\`\`\`json
${JSON.stringify(req.body, null, 2)}
\`\`\`` : ""}

⚠️ **Action Required!**`;

    // Send alert asynchronously without blocking response
    sendAlert(alertMessage)
      .then((result) => {
        if (result.success) {
          console.log("[SUCCESS] Alert sent to Zoho successfully");
        } else {
          console.error("[ERROR] Failed to send alert to Zoho:", result.message);
        }
      })
      .catch((alertErr) => {
        console.error(
          "[ERROR] Exception while sending alert:",
          alertErr.message,
        );
      });
  } else {
    console.log(`[INFO] Non-500 error (${statusCode}), skipping alert`);
  }

  // Determine error message
  // In production, hide internal server error details
  const message =
    process.env.NODE_ENV === "production" && statusCode === 500
      ? "Internal server error"
      : err.message;

  // Determine error data
  // Only send stack trace for 500 errors in development
  const data =
    statusCode === 500
      ? process.env.NODE_ENV === "production"
        ? null
        : err.stack
      : err.data || null;

  // Send consistent error response
  // This is the terminal handler - we send response and don't call next()
  res.status(statusCode).json({
    success: false,
    message,
    data,
    statusCode,
  });
};

export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
