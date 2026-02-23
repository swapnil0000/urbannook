import env from "./envConfigSetup.js";
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite:env.NODE_ENV === "production" ? "None" : "Lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

export default cookieOptions;
