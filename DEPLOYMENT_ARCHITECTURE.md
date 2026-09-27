# UrbanNook — Deployment & Release Architecture

> **Status of this document:** living spec, started 2026-09-26.
> Sections are marked **✅ Live**, **🚧 In progress** or **📋 Planned**. Do not assume a
> 📋 part exists — check the status table in [§9](#9-rollout-status).
>
> **This is the canonical copy.** The admin repo (`urbannook-admin`) points here.
> Any change to how code reaches production must update this file in the same PR.

---

## 0. Rules for anyone changing this system (humans and AI agents)

Read this before touching deploy scripts, CI/CD config, the prod server, `ecosystem.config.cjs`,
env loading, or the admin "Releases" feature.

**MUST — never break these:**

1. **Every production deploy produces a release artifact** (`.tar.gz`) that is stored
   **off the server** (S3) *before* the server switches to it. No artifact → no deploy.
2. **Artifacts never contain secrets.** No `.env*`, no keys. Secrets live only in
   `shared/` on the server (later: Infisical).
3. **A release folder is never edited after it is created.** Fixes go out as a new release.
4. **Switching releases is only done by moving the `current` symlink** + restarting pm2.
   Never deploy by overwriting files inside the live folder.
5. **Keep at least the last 5 releases on the server** and the last 30 days of artifacts in S3.
6. **Rollback must work when the prod server's app is down.** Anything that controls
   deploys/rollbacks (CI, admin panel) must run *outside* the prod EC2.
7. **The admin panel can only trigger fixed, named actions** (deploy release X, roll back to
   release X) through the `UrbanNook-Deploy` SSM document. It must never be able to run an
   arbitrary shell command on prod.
8. **Do not run more than one app instance (pm2 cluster mode) on prod** until the items in
   [§8](#8-known-limitations) (in-memory CSRF store, cron jobs) are fixed. Two instances will
   break cart/checkout.
9. **Manual access (SSH / AWS console) must always remain possible** as the last-resort path
   ("break-glass"). No change may remove it.
10. **User/admin uploads never go into a website (frontend) bucket.** Frontend deploys run
    `aws s3 sync --delete`, which wipes anything not in the build. This already destroyed
    keychain photos and NFC photos (found 2026-09-26). All uploads go to
    `urbannook-assets-storage` (served via Cloudflare `assets-prod.urbannook.in` /
    `assets-staging.urbannook.online`).
11. **When checking that a file exists, check the content type, not just HTTP 200.** The website
    CDN answers missing files with the SPA `index.html` and status 200.

**If your change needs to break one of these rules**, don't work around it — update this
document in the same PR, explain why, and get it reviewed.

**Adding something new** (a new service, a new step in the pipeline, a new admin action):
add it to the relevant section and to the status table in §9.

---

## 1. In plain words (for non-technical readers)

Think of every update to the website as a **sealed box**.

- Every time we release an update, we pack the whole backend into a box (a zip file), give it
  a number (`release 007`), and put **one copy in a safe place outside the server** (Amazon S3).
- The server keeps the last few boxes side by side. A signboard called **`current`** points
  at the box that is live right now.
- **Going live** = pointing the signboard at the new box.
- **Undoing a bad update** = pointing the signboard back at the previous box. Takes seconds.
- If the server itself dies, we take a box from the safe place, put it on a new server, and
  we are back.
- Passwords and keys are **never** inside the boxes. They are kept separately and plugged in
  at start-up.

And from the admin panel, a super-admin will be able to see all boxes, see which one is live,
and switch back to an older one with approval — without needing an engineer at a terminal.

### What problems this solves

| Before | After |
|---|---|
| No rollback. A bad deploy stays live until someone fixes the code. | Roll back to any of the last releases in seconds. |
| Deploy overwrites live files; a failed deploy leaves a half-updated server. | New code goes into a new folder; live only switches when it's complete. |
| If the EC2 dies, recovery means rebuilding from git and hoping it matches prod. | Exact copy of every release is in S3; restore on any server. |
| Only an engineer with SSH access can recover prod. | Super-admins can roll back from the admin panel (with approval + audit log). |
| Secrets copied around in files and CI settings. | One secrets location on the server, later centralised in Infisical. |
| Nobody can tell what version is running. | Every release has a number, date and git commit, visible in admin. |

---

## 2. System overview

```
                         ┌─────────────────────────────────────────┐
  Developer ──push──►    │ CI/CD  (GitHub Actions today → Jenkins) │
                         └───────┬───────────────────────┬─────────┘
                                 │ client                │ server
                                 ▼                       ▼
                  S3 (frontend) + CloudFront     1. build artifact  server-<rel>-<date>-<sha>.tar.gz
                  → customers' browsers          2. upload to S3 artifacts bucket   (rule 1)
                                                 3. tell prod EC2 to deploy <rel>   (SSM)
                                                                 │
  Admin panel                                                    ▼
  Vercel (UI) ──► Render (admin API) ──SSM "UrbanNook-Deploy"──► Prod EC2
                         │                                        /home/ubuntu/urbannook-prod/
                         └──► S3 artifacts (list / upload)          releases/001, 002, …
                                                                    shared/.env.production
                                                                    current → releases/00N
                                                                    artifacts/ (local zips)
                                                                    pm2 → current/src/server.js
                                                                           │
                                                                           ▼
                                                                        MongoDB
```

Components and where they run:

| Component | Runs on | Notes |
|---|---|---|
| Storefront frontend | S3 + CloudFront | Built by CI, static files. Not part of the release/rollback scheme yet. |
| Storefront API | **Prod EC2** (pm2, fork mode, 1 instance) | The thing this document protects. |
| Admin frontend | Vercel | Independent of prod EC2. |
| Admin API | Render | Independent of prod EC2 → can roll prod back even when prod is down. |
| Staging | Separate EC2, auto-stops at 22:00, started from admin | No real traffic. Runs the storefront API as **systemd** `urbannook-server.service` (not pm2): `infisical run --env=staging --projectId=80b13bde-… --path=/user/server -- node src/server.js`. Restart with `sudo systemctl restart urbannook-server` — secrets are only read at start. Also runs `jenkins.service` + `jenkins-agent-staging.service`. |
| Artifacts | S3 bucket (versioning ON) 📋 | Off-server copies of every release. |

---

## 3. Prod server layout

```
/home/ubuntu/urbannook-prod/
├── releases/
│   ├── 001/            ← one complete, immutable copy of the server app (incl. node_modules)
│   ├── 002/
│   └── …               ← keep last 5
├── shared/
│   └── .env.production ← the only copy of prod secrets on disk (chmod 600)
├── current  → releases/00N      ← symlink = what is live
├── artifacts/          ← local copies of the release zips (keep last 5)
├── server/             ← OLD live folder, kept until the new layout is proven
└── server.backup-20260926-1237/ ← one-off backup taken before the migration
```

Inside each release, `.env.production` is a **symlink** to `shared/.env.production`.
The app loads env from `process.cwd()` (`server/src/config/envConfigSetup.js`), so pm2 must be
started with `cwd` = `/home/ubuntu/urbannook-prod/current`.

---

## 4. Release artifact

- **Name:** `server-<release>-<YYYYMMDD-HHMM>-<git-short-sha>.tar.gz`
  e.g. `server-007-20261003-2210-a1b2c3d.tar.gz`
- **Contains:** everything under `server/` **including `node_modules`** (so an emergency
  restore needs no `npm install`), built on Linux x64 with the same Node major version as prod.
- **Never contains:** `.env*`, SSH keys, AWS keys (rule 2). The build must verify this
  (`tar -tzf … | grep -i '\.env'` must return nothing).
- **Stored:** `s3://<artifacts-bucket>/prod/` (versioning ON, 30-day lifecycle) **and**
  `artifacts/` on the server.

---

## 5. Flows

### 5.1 Normal deploy
1. CI builds the server and creates the artifact.
2. CI uploads it to S3. **If this fails, stop.**
3. CI asks prod (via SSM) to deploy release `N`.
4. Prod downloads the artifact → extracts to `releases/N` → links `shared/.env.production`.
5. Prod moves `current` → `releases/N` and restarts pm2.
6. Health check (`GET /health`). If it fails → automatically move `current` back to the
   previous release and restart. 📋
7. Delete releases/artifacts older than the last 5.

### 5.2 Rollback levels

| Level | Use when | How | Time |
|---|---|---|---|
| 1. Symlink | New code is bad, server is fine | `current` → previous release, restart pm2 (or admin panel button 📋) | seconds |
| 2. From local zip | Release folder deleted/corrupted | Extract `artifacts/<zip>` into a new release folder, switch | ~2 min |
| 3. From S3 | Whole EC2 lost | New EC2 → Node + pm2 → `shared/.env.production` → download zip from S3 → extract → switch | ~10–15 min |

### 5.3 Manual runbook (break-glass, rule 9)

Level 1 — roll back to a release:
```bash
cd /home/ubuntu/urbannook-prod
ls -1 releases/                      # pick the previous good one
ln -sfn /home/ubuntu/urbannook-prod/releases/<N> current
pm2 restart urbannook-server
curl -s localhost:<PORT>/health
```

Level 2/3 — restore from a zip:
```bash
cd /home/ubuntu/urbannook-prod
mkdir -p releases/restore
tar -xzf artifacts/<zip>.tar.gz -C releases/restore      # or download from S3 first
ln -s /home/ubuntu/urbannook-prod/shared/.env.production releases/restore/.env.production
ln -sfn /home/ubuntu/urbannook-prod/releases/restore current
pm2 restart urbannook-server
```

---

## 6. Admin panel "Releases" features 📋

Built one at a time, each only after the layer below it is proven.

| # | Feature | Who | Safety |
|---|---|---|---|
| A | **View releases** — list artifacts in S3, show which is live, show health | super_admin | Read-only |
| B | **Roll back / deploy a release** | super_admin + approval (existing approvals system) | Calls only `UrbanNook-Deploy` SSM document with a release id; audit-logged |
| C | **Upload a zip** as a new release, then deploy via B | super_admin + approval | Browser uploads straight to S3 via presigned URL (same pattern as product images); server validates the zip has no `.env*` before it can be deployed |

**Access from Render to AWS:** a dedicated IAM user (e.g. `urbannook-release-ops`), separate
from the one used for image uploads, allowed only to:
- read/write the artifacts bucket prefix,
- `ssm:SendCommand` with the `UrbanNook-Deploy` document on the prod instance only,
- read command results.

Keys live in Render env (later Infisical) and are rotated every 3–6 months.

---

## 7. Secrets

| Stage | Where prod secrets live |
|---|---|
| ✅ Today | `shared/.env.production` on the prod EC2 (chmod 600) + an encrypted backup in the team password manager |
| 📋 Next | Infisical (`--env=prod`), read by a prod-only, read-only machine identity at start-up |

Infisical rules: 2FA for every user; one machine identity per environment, read-only;
admin rights for 1–2 people only.

**Which Infisical project is real (found 2026-09-26):**
- The servers and both repos (`.infisical.json`) use project **`80b13bde-6879-405e-889f-2f9b28f4c0f4`**,
  owned by a different account, with folders `admin/{client,server}` and `user/{client,server}`.
  Scripts always pass `--path=/user/server`, `/admin/server`, etc.
- Project **"urbannook env files" (`a952fbdc-…`)** in org `ab4cb3c8-…` is an imported **copy**
  (created 2026-05-19, everything at root `/`). **Nothing reads it.** Editing it has no effect.
  To be archived.
- Staging EC2 authenticates with a **personal user login** (`~/.infisical/infisical-config.json`),
  not a machine identity. To be replaced by a read-only machine identity.

---

## 8. Known limitations

- **Single `t3.micro` (2 vCPU, ~914 MB RAM), ap-south-1b, Ubuntu 22.04, Node 24, Nginx in
  front, MongoDB is external.** Needs a bigger instance (t3.small+) before traffic grows.
  Resizing = stop → change type → start, ~2–5 min downtime, do it at night.
- **An unused Jenkins was installed on the prod EC2** (no jobs, listening publicly on 8080,
  the biggest RAM user). Stopped + disabled on 2026-09-26 (available RAM 303 → 440 MB, swap
  581 → 105 MB). Data left in `/var/lib/jenkins`; uninstall once Jenkins runs on staging.
  Never run CI on the prod EC2 again.
- **Deploys restart the only instance** → a few seconds of errors during a deploy. Deploy
  at low-traffic times until zero-downtime is possible.
- **Zero-downtime (cluster mode) is blocked by:**
  - `server/src/middleware/csrf.middleware.js` keeps CSRF tokens in an in-memory `Map` — a
    second instance won't know tokens issued by the first → cart/checkout fails.
  - `server/src/cron/zombieOrder.Cleanup.js` (node-cron) would run once per instance.
  - `express-rate-limit` limiters and in-memory caches are per instance.
  Fix these (shared store, single cron runner) before enabling cluster mode (rule 8).

---

## 9. Rollout status

| Step | What | Status |
|---|---|---|
| 1 | Backup of live `server/` folder | ✅ Done 2026-09-26 (`server.backup-20260926-1237`) |
| 2 | `releases/` + `shared/` + `current` layout, release `001` | ✅ Done 2026-09-26 (pm2 still runs from `server/`) |
| 3 | Zip of release 001, copy off-server | 🚧 In progress |
| 4 | pm2 runs from `current` (`server/ecosystem.prod.config.cjs` uses `current` when it lives inside `releases/`) | 🚧 Code ready — live with the first Jenkins server deploy |
| 5 | CI deploys into new release folders + artifact to S3 | 🚧 `jenkins/prod.Jenkinsfile` stages *Build server release* + *Deploy server*; bucket `urbannook-release-artifacts` (versioning ON, 30-day lifecycle on `prod/`) |
| 6 | SSM on prod + `UrbanNook-Deploy` document | 📋 |
| 7 | Jenkins (on staging EC2) replaces GitHub Actions | 🚧 2026-09-28 — job `UrbanNook-Prod-Deploy`; `prod-deploy.yml` moved unchanged to `.github/disabled/` (sync-staging, pr-check still on GitHub Actions). Nightly SEO rebuild moved 03:00 → 21:30 IST (staging EC2 is off after 22:00) |
| 8 | Infisical for prod secrets | ✅ Live 2026-09-27 — pm2 → `server/scripts/start-prod.sh` → `infisical run` (prod, `/user/server`) via machine identity `prod-ec2-reader` (creds in `/home/ubuntu/.infisical-prod.env`, chmod 600). Falls back to `.env.production` if Infisical login fails. Retire `.env.production` + fallback after ~1 week. |
| 9 | Admin feature A (view) → B (rollback) → C (upload) | 📋 |
| 10 | Health-check auto-rollback | 🚧 In *Deploy server*: failed `/health` → `current` moves back to the previous release |
| 11 | Instance resize, then cluster mode after §8 fixes | 📋 |

Update this table in the same PR that changes a step's status.
