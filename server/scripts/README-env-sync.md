# Env Sync (Infisical) — zero `.env` files on disk

No `.env` / `.env.staging` file should exist on ANY machine for
**development** or **staging** — not a developer laptop, not EC2. Every
value lives only in Infisical. `npm run dev` / `npm start` (server) and
`npm run dev` / `build*` (client) all fetch secrets live at process-start
time via `infisical run`, which injects them straight into the process's
memory — nothing ever touches disk.

`production` is not yet migrated — `.env.production` still exists locally on
purpose and keeps working exactly as before until production is moved over.

## Folder structure in Infisical

One shared project ("Urbannook") holds both repos, split by app and by
server/client, under each environment:

```
dev/        (Infisical's slug for "development")
├── admin/
│   ├── server/
│   └── client/
└── user/                 (this repo — the customer-facing storefront)
    ├── server/
    └── client/
staging/
├── admin/{server,client}
└── user/{server,client}
```

This repo's server uses `/user/server`, its client uses `/user/client`.
Note: this repo's own `NODE_ENV` values (`development`/`staging`/`production`)
do **not** match Infisical's own environment slugs (`dev`/`staging`/`prod`) —
every script here does that translation for you; you never need to remember it.

## `.env.example` — reference only, never loaded

`server/.env.example` and `client/.env.example` list every key each app
needs, with empty values. They are committed to git and exist purely so a
human can see what's required without ever running a command that prints
real values. The app does **not** read this file. If a required variable is
actually missing, the app fails to start with an explicit error naming the
missing key (never its value) — see "Missing variables" below.

## The `[ENV] Source: ...` boot log

Every server start prints one line telling you where its config came from:

- `INFISICAL (live via infisical run, no file on disk)` — correct, expected
  state for development/staging.
- `DISK FILE (...)` — a `.env`/`.env.staging` file exists on disk; this
  should not happen anymore for dev/staging — push any real values it has
  into Infisical via `infisical secrets set KEY=value --env=<dev|staging>
  --path=/user/server`, then delete the file.
- `NONE FOUND` — neither Infisical nor a disk file supplied anything;
  `infisical login` / Machine Identity setup is likely missing.

This line never prints a key name or value, only which source was used.

## Missing variables

If a variable the app actually needs isn't set, the app logs which key is
missing (by name only, never a value) and exits — see `src/config/validateEnv.js`.
Fix it by adding the key in the Infisical dashboard (or `infisical secrets set
KEY=value --env=<dev|staging|prod> --path=/user/server`), not by creating a
local file.

## ⚠️ Never print real values to a terminal/log

- `infisical secrets set ...` and `infisical secrets set --file ...` mask
  values in their own output (`******`) — safe to run.
- `infisical secrets` / `infisical secrets get` (no subcommand or `get`)
  print **full plaintext values** by default. Never run these in a shared
  terminal, CI log, or anywhere the output could be captured/shared. If you
  need to check a value, use the Infisical dashboard instead.
- Never pass `--show-values` or `--plain` unless you are alone at your own
  terminal and about to immediately clear scrollback.
- If you ever need key names only (no values) for scripting, request
  `-o json` output and redirect it straight to a local file, then parse the
  file for the `secretKey` field — never let raw values reach a shared
  terminal/log/chat.

## One-time setup (per machine, including EC2)

1. Create a free account at https://infisical.com and a project (e.g. "Urbannook").
2. Inside the project, create the `dev`/`staging` folder structure shown above
   (`infisical secrets folders create --path=/user --name=server --env=dev`, etc.)
   — already done for this project as of this setup.
3. Install the Infisical CLI on every machine that will run this server or
   client (laptop or EC2):
   - macOS: `brew install infisical/get-cli/infisical`
   - Linux: `curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.deb.sh' | sudo -E bash && sudo apt-get install -y infisical`
4. Authenticate:
   - **Developer laptop**: run `infisical login` once (browser-based auth; the
     session token is stored by the CLI in its own local config, never in this
     repo).
   - **EC2 (no browser)**: in the Infisical dashboard, create a
     **Machine Identity** (Universal Auth) scoped to this project, then set
     these as real system environment variables on the box (e.g. in
     `/etc/environment` or the deploy user's shell profile — NOT in any file
     inside this repo):
     ```
     INFISICAL_UNIVERSAL_AUTH_CLIENT_ID=...
     INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET=...
     ```
     These two values are the only thing that ever needs to exist outside
     Infisical, and they only grant access to fetch secrets — they are not
     themselves an env file the app reads, so there's no circular dependency.

## Adding or changing a value

Use the Infisical dashboard, or:

```bash
infisical secrets set KEY=value --env=dev --path=/user/server
```

## Day-to-day usage

Nothing to pull manually — just run the app normally:

```bash
npm run dev            # development, secrets fetched live from Infisical
npm run dev:staging
npm start               # or start:staging
```

(`dev:prod` / `start:prod` / `build:prod` already point at the `prod` slug in
Infisical for whenever production gets migrated — until then they'll behave
like an empty/missing config there, so keep using `.env.production` normally
for production.)

Every invocation talks to Infisical fresh, so there is never a stale local
copy to go out of sync.

## EC2 / PM2

`ecosystem.config.cjs` runs `server/pm2-entry.sh`, which wraps the actual
`node src/server.js` in `infisical run`, translating `NODE_ENV` to the
matching Infisical slug (`development`→`dev`, `production`→`prod`,
`staging`→`staging`). As long as the Machine Identity env vars from step 4
are set on the box, `pm2 restart ecosystem.config.cjs --env staging` always
starts with the latest secrets — no `.env.staging` file to keep in sync,
nothing for a deploy script to exclude or overwrite.
