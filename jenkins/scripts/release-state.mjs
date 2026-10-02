// Updates prod/state.json in the release artifacts bucket — the record the
// admin panel reads to show what is live (it works even when Jenkins/staging
// is off, because it reads S3, not Jenkins).
//
// Usage (run by Jenkins, AWS CLI creds from the agent):
//   node release-state.mjs <component server|client> <action deploy|rollback>
//        <release> <commit> <developer> <triggeredBy> <jenkinsJob> <buildNumber>
//
// Shape:
//   { updatedAt, live: { server: {...entry}, client: {...entry} },
//     history: [ newest first, max 100 ] }
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const BUCKET = process.env.ARTIFACTS_BUCKET || "urbannook-release-artifacts";
const KEY = "prod/state.json";
const [component, action, release, commit, developer, triggeredBy, job, build] = process.argv.slice(2);

if (!["server", "client"].includes(component) || !["deploy", "rollback"].includes(action) || !release) {
  console.error("release-state: bad arguments", process.argv.slice(2));
  process.exit(1);
}

const tmp = `state-${process.pid}.json`;
let state = { live: {}, history: [] };
try {
  execFileSync("aws", ["s3", "cp", `s3://${BUCKET}/${KEY}`, tmp, "--only-show-errors"], { stdio: "ignore" });
  state = JSON.parse(fs.readFileSync(tmp, "utf8"));
} catch {
  console.log("release-state: no existing state.json, starting fresh");
}
state.live ||= {};
state.history ||= [];

const entry = {
  component, action, release,
  commit: commit || null,
  developer: developer || null,
  triggeredBy: triggeredBy || null,
  jenkins: job ? { job, build: Number(build) || null } : null,
  at: new Date().toISOString(),
};

state.live[component] = entry;
state.history.unshift(entry);
state.history = state.history.slice(0, 100);
state.updatedAt = entry.at;

fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
execFileSync("aws", ["s3", "cp", tmp, `s3://${BUCKET}/${KEY}`,
  "--content-type", "application/json", "--cache-control", "no-store", "--only-show-errors"], { stdio: "inherit" });
fs.rmSync(tmp, { force: true });
console.log(`release-state: ${component} ${action} → ${release}`);
