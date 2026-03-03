import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mode = process.env.NODE_ENV || "development"; 

const envFile = mode === "production" ? ".env.production" : ".env";
const envPath = path.resolve(__dirname, `../../${envFile}`); 

console.log(`⏳ Loading Environment: ${envFile} (Mode: ${mode})`);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error(`❌ Failed to load ${envFile}:`, result.error.message);
}

export default process.env;