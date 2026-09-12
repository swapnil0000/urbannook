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

// Never log key names or values here — only where the config came from.
const fileExistsOnDisk = fs.existsSync(envPath);
const hadKeysBeforeDotenv = Boolean(process.env.DB_URI);

const result = dotenv.config({ path: envPath });
if (result.error && fileExistsOnDisk) {
  console.error(`❌ Error loading ${envFile}:`, result.error.message);
}

const source = fileExistsOnDisk
  ? `DISK FILE (${envFile} exists on disk — unexpected for dev/staging, see scripts/README-env-sync.md)`
  : hadKeysBeforeDotenv
  ? "INFISICAL (live via `infisical run`, no file on disk)"
  : "NONE FOUND (run via `infisical run`, or see scripts/README-env-sync.md)";
console.log(`[ENV] Source: ${source}`);

export default process.env;