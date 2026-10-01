// Builds the env-keys input for release-bundle.mjs from two files of key names
// (one per line, as `infisical export --format=dotenv | cut -d= -f1` prints).
// Names only — this never sees secret values.
// Usage: node env-keys-json.mjs <server-keys.txt> <client-keys.txt> <out.json>
import fs from "node:fs";

const [serverFile, clientFile, out] = process.argv.slice(2);
const names = (p) => fs.readFileSync(p, "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
fs.writeFileSync(out, JSON.stringify({ server: names(serverFile), client: names(clientFile) }));
