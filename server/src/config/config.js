import env from "./envConfigSetup.js";

// Cookie security configuration.
// Set SECURE_COOKIES=true in your .env.production ONLY when deploying to
// actual HTTPS production (api.urbannook.in). When testing production mode
// locally over HTTP, leave it unset or false — otherwise the browser
// silently drops secure cookies and auth breaks completely.
const useSecureCookies = env.SECURE_COOKIES === "true";

const cookieOptions = {
  httpOnly: true,
  secure: useSecureCookies,
  sameSite: useSecureCookies ? "None" : "Lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

// Refresh token cookie — longer lived, httpOnly, only sent to /refresh-token
const refreshCookieOptions = {
  httpOnly: true,
  secure: useSecureCookies,
  sameSite: useSecureCookies ? "None" : "Lax",
  maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days (matches refresh token expiry)
  path: "/api/v1/refresh-token",     // only sent to the refresh endpoint
};

export default cookieOptions;
export { refreshCookieOptions };
