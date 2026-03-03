import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mode = process.env.NODE_ENV || "development"; 

const envFile = mode === "production" ? ".env.production" : ".env";
const envPath = path.resolve(__dirname, `../../${envFile}`); 

const envPath = path.resolve(__dirname, `../../${envFile}`);

console.log(`⏳ Loading Environment from: ${envFile}`);
console.log(`📁 Full path: ${envPath}`);

export default process.env;