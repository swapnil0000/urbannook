import dotenv from "dotenv";
import path from "path";
import fs from "fs";

const mode = process.env.NODE_ENV || "development";

const envFiles = {
  development: ".env",
  staging: ".env.staging",
  production: ".env.production"
};

const envFile = envFiles[mode] || ".env";

// Try current directory first, then fallback to 'server' folder if running from root
let envPath = path.resolve(process.cwd(), envFile);

if (!fs.existsSync(envPath)) {
  const fallbackPath = path.resolve(process.cwd(), "server", envFile);
  if (fs.existsSync(fallbackPath)) {
    envPath = fallbackPath;
  }
}

console.log(`🚀 Mode: ${mode.toUpperCase()}`);
console.log(`⏳ Loading Environment from: ${envFile}`);
console.log(`📁 Full path: ${envPath}`);

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error(`❌ Error loading ${envFile}:`, result.error.message);
}

export default process.env;