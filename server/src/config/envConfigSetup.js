import dotenv from "dotenv";
import path from "path";

const mode = process.env.NODE_ENV || "development";

const envFiles = {
  development: ".env",
  staging: ".env.staging",
  production: ".env.production"
};

const envFile = envFiles[mode] || ".env";

const envPath = path.resolve(process.cwd(), envFile);

console.log(`🚀 Mode: ${mode.toUpperCase()}`);
console.log(`⏳ Loading Environment from: ${envFile}`);
console.log(`📁 Full path: ${envPath}`);

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error(`❌ Error loading ${envFile}:`, result.error.message);
}

export default process.env;