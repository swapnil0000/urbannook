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

11. **API versioning.** New and reworked endpoints go to `/api/v2` (`server/src/routes/v2/`), layered
    route → controller → service (`server/src/services/`), one envelope (`server/src/utils/apiV2.js`),
    list views return slim cards. v1 endpoints are **never deleted**: once they have a v2 successor
    they move to `server/src/routes/v1-deprecated/`, send `Deprecation` + `Link` headers
    (`middleware/deprecation.middleware.js`), and carry a comment saying why they moved and where.

## 3a. Mandatory workflow for every change (all developers and every AI assistant)

1. `git fetch origin`, check out `main`, pull so local `main` equals `origin/main`. Cut the branch
   from it. Conflicts or uncommitted work in the way: stop and ask the developer.
2. An **engineer** (2–3 yrs level) makes the change.
3. A **Senior Dev** (10 yrs full stack + deployment + AWS + AI) and a **Principal Architect**
   (infra, cost, architecture, **SEO mandatory**) review together, discuss, and mark each finding
   must-fix / not needed. Suspected bugs without evidence are reported to the developer separately.
4. The engineer fixes the must-fix items; both re-check. Only when **both are OK** does it go to the
   **QA Lead**, who tests everything.
5. QA OK, then commit, **with the developer's own git identity only: no AI co-author lines, no
   "generated with" text, no emoji**.
6. Push the branch and open **two PRs: one to `main`, one to `staging`**. If `main` and `staging`
   differ, the sync workflow raises its own PR; say whether that sync PR is merged yet.
7. Never push to `main` directly.

## 4. Where things are

- Deploy code: `jenkins/` (prod, rollback, staging, `scripts/`), `infra/cloudflare/`
- Backend: `server/` (Express, Mongoose) · Website: `client/` (React, Vite, RTK Query)
- Admin panel & Time Machine: separate repo `urbannook-admin`

## Code navigation: graphify knowledge graph (all AI assistants and developers)

Use the graph first, then read only the lines it points to. Do not explore the repo cold: that costs many tokens and is where tracing mistakes come from.

- One-time setup per machine: `pip install graphifyy` (official package: two y's, repo github.com/Graphify-Labs/graphify, no forks), then `graphify install` (add `--platform cursor|codex|copilot|...` for other assistants). Per clone: `graphify hook install`, then `graphify update .`, and add `graphify-out/` and `.gitattributes` to `.git/info/exclude`
- The graph lives in `graphify-out/` (local, not committed). Git hooks rebuild it in the background after every commit, checkout, merge and rebase (code only, no API cost), so nobody has to run anything.
- Before the first search or file read, use `graphify explain "<file or symbol>"`, `graphify path "<A>" "<B>"` or `graphify query "<question>"`, and put this rule in every subagent prompt. Prefer `explain` / `path` with exact file or function names: free-text `query` is fuzzy. If the graph has no node for a name (constants, query-param keys), grep for it.
- Evidence in reviews and PRs still cites real `file:line` read from the code. The graph is for finding things, not proof.
