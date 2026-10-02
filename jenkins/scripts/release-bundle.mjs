// Writes a release bundle for a prod deploy / rollback — the single record of
// "what was live after this run, and what it needed":
//
//   s3://<bucket>/prod/bundles/<id>/manifest.json
//     status (success|failed) + failed stage, action, commit, developer, who,
//     Jenkins job/build, server + client release LIVE after the run (from
//     prod/state.json, so client-only deploys still record the server and vice
//     versa), artifact keys, pre-deploy DB snapshot folder, workers deployed.
//   s3://<bucket>/prod/bundles/<id>/env-keys.json
//     Infisical key NAMES (never values) for prod /user/server and /user/client,
//     plus what was added/removed since the previous successful bundle.
//
// Artifacts are referenced, not copied (each is ~150 MB and already in S3).
// Read by the admin panel (Time Machine → Deploy history), which can restore a
// successful bundle's server + client in one step (prod-rollback, COMPONENT=both).
//
// Inputs (environment, set by the Jenkinsfile):
//   BUNDLE_ACTION   deploy | nightly | rollback      BUNDLE_STATUS  success | failed
//   FAILED_STAGE    stage that failed (failed runs)  BUNDLE_STAMP   YYYYMMDD-HHMM (IST)
//   DEPLOY_COMMIT, DEV, TRIGGERED_BY, JOB_NAME, BUILD_NUMBER, REASON
//   RELEASE, CLIENT_RELEASE   what THIS run deployed/switched ('' if untouched)
//   DB_SNAPSHOT, DB_SNAPSHOT_STATUS                  pre-deploy snapshot (if taken)
//   WORKERS_CHANGED  true if Cloudflare workers were deployed
//   ENV_KEYS_FILE   JSON { server: [names], client: [names] } — optional
//   RESTORED_BUNDLE  bundle id a rollback restored ('' otherwise)
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const BUCKET = process.env.ARTIFACTS_BUCKET || "urbannook-release-artifacts";
const e = (k) => process.env[k] || "";
const aws = (args, opts = {}) => execFileSync("aws", args, { encoding: "utf8", ...opts });

const readJsonFromS3 = (key) => {
  try { return JSON.parse(aws(["s3", "cp", `s3://${BUCKET}/${key}`, "-"], { stdio: ["ignore", "pipe", "ignore"] })); }
  catch { return null; }
};
const writeJsonToS3 = (key, obj) => {
  const tmp = `bundle-${process.pid}-${Math.random().toString(36).slice(2)}.json`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  try { aws(["s3", "cp", tmp, `s3://${BUCKET}/${key}`, "--content-type", "application/json", "--cache-control", "no-store", "--only-show-errors"], { stdio: "inherit" }); }
  finally { fs.rmSync(tmp, { force: true }); }
};

const status = e("BUNDLE_STATUS") === "success" ? "success" : "failed";
const commit7 = e("DEPLOY_COMMIT").slice(0, 7) || "0000000";
const id = `${e("BUNDLE_STAMP")}-${commit7}-${(e("DEV") || "unknown").replace(/[^a-z0-9-]/gi, "-")}-b${e("BUILD_NUMBER") || "0"}`;
if (!/^[0-9]{8}-[0-9]{4}-[A-Za-z0-9-]+$/.test(id)) {
  console.error(`release-bundle: bad bundle id "${id}" — is BUNDLE_STAMP set?`);
  process.exit(1);
}

// What is live now (release-state.mjs has already recorded this run's changes).
const state = readJsonFromS3("prod/state.json") || { live: {} };
const live = state.live || {};
const serverRel = live.server?.release || null;
const clientRel = live.client?.release || null;

// Artifact keys for the live releases (server: new prod/server/ layout).
// Legacy releases 001/002 are plain numbers with differently named artifacts.
const serverKey = serverRel && !/^\d{3}$/.test(serverRel) ? `prod/server/server-${serverRel}.tar.gz` : null;
const clientKey = clientRel ? `prod/client/client-${clientRel}.tar.gz` : null;

const manifest = {
  id,
  status,
  failedStage: status === "failed" ? e("FAILED_STAGE") || "unknown" : null,
  action: e("BUNDLE_ACTION") || "deploy",
  createdAt: new Date().toISOString(),
  commit: e("DEPLOY_COMMIT") || null,
  developer: e("DEV") || null,
  triggeredBy: e("TRIGGERED_BY") || null,
  reason: e("REASON") || null,
  jenkins: { job: e("JOB_NAME"), build: Number(e("BUILD_NUMBER")) || null },
  changed: {
    server: e("RELEASE") || null,
    client: e("CLIENT_RELEASE") || null,
    workers: e("WORKERS_CHANGED") === "true",
  },
  server: serverRel ? { release: serverRel, artifact: serverKey, since: live.server?.at || null } : null,
  client: clientRel ? { release: clientRel, artifact: clientKey, since: live.client?.at || null } : null,
  dbSnapshot: e("DB_SNAPSHOT")
    ? { folder: e("DB_SNAPSHOT"), status: e("DB_SNAPSHOT_STATUS") || "unknown", taken: "before the server switch" }
    : null,
  restoredBundle: e("RESTORED_BUNDLE") || null,
};

// Env key names + diff against the previous successful bundle.
let envKeys = null;
if (e("ENV_KEYS_FILE") && fs.existsSync(e("ENV_KEYS_FILE"))) {
  const cur = JSON.parse(fs.readFileSync(e("ENV_KEYS_FILE"), "utf8"));
  const server = [...new Set(cur.server || [])].sort();
  const client = [...new Set(cur.client || [])].sort();

  let prev = null;
  try {
    const ids = aws(["s3api", "list-objects-v2", "--bucket", BUCKET, "--prefix", "prod/bundles/", "--delimiter", "/",
      "--query", "CommonPrefixes[].Prefix", "--output", "text"], { stdio: ["ignore", "pipe", "ignore"] })
      .split(/\s+/).filter((p) => p.startsWith("prod/bundles/")).map((p) => p.slice(13, -1))
      .filter((x) => x < id).sort().reverse();
    for (const pid of ids.slice(0, 20)) {
      const pm = readJsonFromS3(`prod/bundles/${pid}/manifest.json`);
      if (pm?.status !== "success") continue;
      prev = readJsonFromS3(`prod/bundles/${pid}/env-keys.json`);
      if (prev) { prev.bundle = pid; break; }
    }
  } catch { /* first bundle */ }

  const diff = (now, before) => ({
    added: now.filter((k) => !(before || []).includes(k)),
    removed: (before || []).filter((k) => !now.includes(k)),
  });
  envKeys = {
    note: "Key names only — values live in Infisical and are never stored here.",
    source: { server: "Infisical prod /user/server", client: "Infisical prod /user/client" },
    server,
    client,
    comparedWith: prev?.bundle || null,
    changes: prev ? { server: diff(server, prev.server), client: diff(client, prev.client) } : null,
  };
}

if (envKeys) writeJsonToS3(`prod/bundles/${id}/env-keys.json`, envKeys);
// Manifest last — the admin panel only lists bundles that have one.
writeJsonToS3(`prod/bundles/${id}/manifest.json`, manifest);
console.log(`release-bundle: ${id} [${status}] server=${serverRel || "-"} client=${clientRel || "-"} db=${manifest.dbSnapshot?.status || "none"}`);
