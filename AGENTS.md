# Instructions for AI assistants and developers — storefront repo (urbannook)

**Mandatory for every AI assistant** (Claude Code, Cursor, Copilot, Codex, ChatGPT, …) and every
developer working in this repo. Suggestions that ignore the system's architecture are wrong even
if the code works.

## 1. Read before suggesting anything that touches how the system runs

| Document | Where | What it covers |
|---|---|---|
| **Deploy spec & rules** | `DEPLOYMENT_ARCHITECTURE.md` (this repo) | Releases, rollback, S3 layout, bundles, hard rules (§0) |
| **System Guide** | admin repo → `urbannook-admin/client/src/content/system-guide.md` (also Admin panel → *System Guide*) | Map of every part, admin ↔ storefront link, Jenkins jobs, cache timings, debug runbook |

If you (the AI) cannot open the System Guide, ask the developer to paste the relevant section —
do not guess how deploys, caches or secrets work.

## 2. Before every suggestion, check it against the architecture

State briefly which parts your change affects (client / server / DB / deploy / cache / secrets /
admin API) and confirm it does not break any rule below. If it does, say so and propose the
compliant alternative instead.

## 3. Rules — never suggest breaking these

1. **Production deploys only through Jenkins** (`jenkins/prod.Jenkinsfile`) from reviewed PRs
   into `main`. Don't add GitHub Actions deploys (`.github/disabled/prod-deploy.yml` stays
   disabled), SSH/rsync/scp deploys, or manual file copies to the prod EC2.
2. **Secrets only in Infisical** (`prod|staging` → `/user/server`, `/user/client`). Never commit
   `.env*`, never hard-code keys, never suggest putting secrets in GitHub, Render or Jenkins files.
   New env var → add it to Infisical for **both** staging and prod, and to the checks in the
   Jenkinsfile if the build needs it.
3. **Uploads only in `urbannook-assets-storage`** (served at `assets-prod.urbannook.in`). Never
   store files in a website bucket — a deploy wipes it.
4. **The prod server runs as numbered releases** (`releases/NNN` + `current`, pm2, one instance).
   Don't suggest pm2 cluster mode, editing files on the server, or in-place deploys.
   `server/scripts/start-prod.sh` and `server/ecosystem.prod.config.cjs` are part of that — change
   them only with the deploy spec in mind.
5. **Caching is deliberate** (System Guide §7): server product cache 10 min
   (`server/src/module/cache.manager.module.js`), client RTK cache 5 min, Cloudflare doesn't cache
   the API, images 1 day, `index.html` never cached. Don't change TTLs or Cloudflare rules without
   updating the guide.
6. **Cloudflare workers are deployed from `infra/cloudflare/`** by Jenkins — never edited in the
   dashboard. Keep `keep_vars = true`.
7. **Prod and staging never share data, secrets or backups.** Every script that touches a DB must
   check `NODE_ENV` against the DB it connects to.
8. **Data changes need a way back.** Scripts that bulk-update or delete production data must run
   against a recent DB snapshot (Time Machine → Take snapshot now) and support a dry run.
9. **SEO / analytics code** (`client/scripts/prerender.mjs`, `jenkins/scripts/upload-client.sh`
   steps, `client/src/utils/analytics.js`) belongs to the SEO owner — suggest changes in
   `SEO_ANALYTICS_HANDOFF.md`, don't rewrite it silently.
10. **Anything that changes how the system works updates the docs in the same PR**:
    `DEPLOYMENT_ARCHITECTURE.md` here and the System Guide in the admin repo.

## 4. Where things are

- Deploy code: `jenkins/` (prod, rollback, staging, `scripts/`), `infra/cloudflare/`
- Backend: `server/` (Express, Mongoose) · Website: `client/` (React, Vite, RTK Query)
- Admin panel & Time Machine: separate repo `urbannook-admin`
