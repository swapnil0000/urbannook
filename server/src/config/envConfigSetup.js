import dotenv from "dotenv";
import path from "path";
import fs from "fs";

const mode = process.env.NODE_ENV || "development";

console.log(`🚀 Mode: ${mode.toUpperCase()}`);
console.log("🔐 Environment variables are provided by the process environment.");

export default process.env;

