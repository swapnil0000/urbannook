import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env";

const envPath = path.resolve(__dirname, `../${envFile}`);

console.log(`⏳ Loading Environment from: ${envFile}`);

dotenv.config({ path: envPath });
