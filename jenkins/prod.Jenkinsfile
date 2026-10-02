// ============================================================================
// PRODUCTION DEPLOY — storefront (urbannook.in)
// Jenkins job: UrbanNook-Prod-Deploy (Pipeline script from SCM, branch main,
// script path jenkins/prod.Jenkinsfile). Staging has its own file:
// jenkins/staging.Jenkinsfile — keep the two separate on purpose.
//
// WHERE THINGS RUN vs WHERE THEY GO
//   Runs on : the Jenkins agent labelled 'staging' — i.e. the STAGING EC2,
//             where Jenkins is installed. Builds (npm, vite) happen there so
//             the prod server never carries build load.
//   Deploys : PRODUCTION only —
//               frontend → S3 bucket urbannook-prod-frontend + Cloudflare
//                          cache purge for the urbannook.in zone
//               backend  → prod EC2 172.31.13.243 (private IP, same VPC) as a
//                          numbered release: releases/<N> + `current` symlink
//               release artifacts → s3://urbannook-release-artifacts/prod/
//                   server/  client/  db/ (snapshots)  bundles/ (one per run)
//
// FLOW (each step only runs if the previous one passed)
//   1. Checkout main
//   2. Detect what changed since the LAST SUCCESSFUL prod deploy
//   3. Build the frontend           ← nothing deployed yet; a failure here
//   4. Build the server release       leaves prod completely untouched
//      (tar.gz incl. node_modules → S3)
//   4b. DB snapshot (server deploys only): started right after 'Detect changes'
//      so it runs WHILE the builds run (no extra deploy time); 'Wait for DB
//      snapshot' just confirms it finished before the server switches. The
//      admin API (the only service allowed into the prod DB) writes it to
//      prod/db/. A failed snapshot warns but does not block the deploy.
//   5. Deploy the release: extract to releases/<N>, move `current`, restart,
//      health check — on failure `current` goes back to the previous release
//   6. Cloudflare workers (only if infra/cloudflare/ changed)
//   7. Upload the frontend + purge Cloudflare cache
//   8. Release bundle (post, success AND failure): prod/bundles/<id>/ —
//      manifest (server + client live after the run, commit, who, DB snapshot,
//      failed stage) and env-keys.json (Infisical key NAMES + diff, never
//      values). Admin → Time Machine → Deploy history lists them and can
//      restore a successful one (server + client together).
//
// TRIGGERS (GitHub Actions' prod workflow must be DISABLED — both would deploy)
//   - Merge to main: GitHub webhook starts the job automatically.
//   - Nightly 21:30 IST: client only, refreshes prerendered SEO product pages.
//   - Manual: "Build with Parameters" (DEPLOY_ALL). Always deploys main.
//
// SECRETS (none are stored in this file)
//   - Frontend build values : Infisical prod /user/client, fetched with the
//     Jenkins machine identity (Jenkins creds INFISICAL_CLIENT_ID/SECRET).
//   - Backend secrets       : NOT handled here. The prod server loads them
//     itself from Infisical when it starts (server/scripts/start-prod.sh).
//   - SSH to prod           : /home/ubuntu/.ssh/prod_deploy on the agent.
//     On prod this key only works from the staging private IP.
//   - Cloudflare            : Jenkins creds URBANNOOK_PROD_CF_TOKEN and
//     URBANNOOK_PROD_CF_ZONE_ID (token can only purge urbannook.in cache).
//   - Cloudflare Workers    : Jenkins creds CLOUDFLARE_WORKERS_TOKEN ("Edit
//     Cloudflare Workers" token) and CLOUDFLARE_ACCOUNT_ID. Worker code +
//     wrangler configs live in infra/cloudflare/ — never edit workers in the
//     Cloudflare dashboard.
//
// See DEPLOYMENT_ARCHITECTURE.md before changing this file.
// ============================================================================

// Release bundle for this run (see step 8). Never fails the build — a missing
// bundle only means Deploy history lacks this entry.
def writeBundle(String status) {
  if (!env.STAMP) { echo 'No bundle: the run stopped before Detect changes'; return }
  if (status == 'success' && env.CLIENT_CHANGED != 'true' && env.SERVER_CHANGED != 'true' && env.WORKERS_CHANGED != 'true') {
    echo 'No bundle: nothing was deployed'
    return
  }
  try {
    withCredentials([
      string(credentialsId: 'INFISICAL_CLIENT_ID', variable: 'INFISICAL_CLIENT_ID'),
      string(credentialsId: 'INFISICAL_CLIENT_SECRET', variable: 'INFISICAL_CLIENT_SECRET'),
    ]) {
      // Key NAMES only — values are never written to a file or the log.
      sh '''
        set +x
        rm -f env-keys-input.json
        export INFISICAL_TOKEN="$(infisical login --method=universal-auth \
          --client-id="$INFISICAL_CLIENT_ID" --client-secret="$INFISICAL_CLIENT_SECRET" --silent --plain)"
        if [ -n "$INFISICAL_TOKEN" ]; then
          infisical export --projectId="$INFISICAL_PROJECT_ID" --env=prod --path=/user/server --format=dotenv | cut -d= -f1 > keys-server.txt
          infisical export --projectId="$INFISICAL_PROJECT_ID" --env=prod --path=/user/client --format=dotenv | cut -d= -f1 > keys-client.txt
          node jenkins/scripts/env-keys-json.mjs keys-server.txt keys-client.txt env-keys-input.json
          rm -f keys-server.txt keys-client.txt
        else
          echo "WARNING: Infisical login failed — bundle written without env keys"
        fi
        unset INFISICAL_TOKEN
      '''
    }
    withEnv(["BUNDLE_STATUS=${status}", "BUNDLE_STAMP=${env.STAMP}", "FAILED_STAGE=${env.LAST_STAGE ?: ''}",
             "ENV_KEYS_FILE=env-keys-input.json"]) {
      sh 'node jenkins/scripts/release-bundle.mjs'
    }
  } catch (e) {
    echo "WARNING: release bundle not written: ${e.message}"
  }
}

pipeline {
  // Label of the Jenkins node that RUNS the build (the staging EC2).
  // Not the deploy target — see PROD_HOST / S3_BUCKET below.
  agent { label 'staging' }

  // Nightly SEO refresh at 21:30 IST, NOT 03:00 like the old GitHub Actions
  // run — Jenkins lives on the staging EC2, which is shut down at 22:00, so a
  // 03:00 trigger would never fire. A timer run rebuilds the client only (see
  // 'Detect changes').
  // githubPush: GitHub webhook → deploys right after a PR is merged into main
  // (same webhook the staging job uses; main only changes via reviewed PRs).
  triggers {
    githubPush()
    cron('TZ=Asia/Kolkata\n30 21 * * *')
  }

  options {
    disableConcurrentBuilds()
    timestamps()
    timeout(time: 30, unit: 'MINUTES')
  }

  parameters {
    booleanParam(name: 'DEPLOY_ALL', defaultValue: false,
      description: 'Deploy client AND server even if they did not change since the last successful deploy')
    string(name: 'TRIGGERED_BY', defaultValue: '',
      description: 'Set by the admin panel (admin email). Leave empty when running by hand.')
  }

  // Deploy targets — every value here is PRODUCTION.
  environment {
    INFISICAL_PROJECT_ID = '80b13bde-6879-405e-889f-2f9b28f4c0f4'
    S3_BUCKET            = 'urbannook-prod-frontend'
    PROD_HOST            = 'ubuntu@172.31.13.243'
    PROD_BASE            = '/home/ubuntu/urbannook-prod'
    ARTIFACTS_BUCKET     = 'urbannook-release-artifacts'
    PROD_SSH_KEY         = '/home/ubuntu/.ssh/prod_deploy'
    SSH_OPTS             = '-i /home/ubuntu/.ssh/prod_deploy -o StrictHostKeyChecking=yes -o BatchMode=yes'
    // Admin API (Render) — takes the pre-deploy DB snapshot (prod DB access is
    // limited to it). Auth: TIME_MACHINE_SECRET from Infisical prod /admin/server.
    ADMIN_API            = 'https://urbannook-store.onrender.com/api/v1/admin'
  }

  stages {
    stage('Checkout') {
      steps {
        script {
          def scm = checkout([$class: 'GitSCM',
            branches: [[name: '*/main']],  // prod deploys main ONLY — no branch choice on purpose
            userRemoteConfigs: [[url: 'git@github.com:swapnil0000/urbannook.git', credentialsId: 'urbannook-agent-key']]])
          env.DEPLOY_COMMIT = scm.GIT_COMMIT
          env.LAST_GOOD     = scm.GIT_PREVIOUS_SUCCESSFUL_COMMIT ?: ''
          echo "Deploying main @ ${env.DEPLOY_COMMIT} (last successful prod deploy: ${env.LAST_GOOD ?: 'none'})"
        }
      }
    }

    // Compare against the last SUCCESSFUL deploy, not just the last commit —
    // otherwise a multi-commit push or a previously failed deploy silently
    // skips changes. No previous success (first run) → deploy everything.
    stage('Detect changes') {
      steps {
        script {
          // Timer (nightly) run: rebuild ONLY the client so the prerendered
          // product pages / sitemap pick up price & stock changes from the
          // live feed. The server is not touched on a nightly run.
          def byTimer = !currentBuild.getBuildCauses('hudson.triggers.TimerTrigger$TimerTriggerCause').isEmpty()
          env.BUNDLE_ACTION = byTimer ? 'nightly' : 'deploy'
          if (byTimer) {
            env.CLIENT_CHANGED  = 'true'
            env.SERVER_CHANGED  = 'false'
            env.WORKERS_CHANGED = 'false'
          } else if (params.DEPLOY_ALL || !env.LAST_GOOD) {
            env.CLIENT_CHANGED  = 'true'
            env.SERVER_CHANGED  = 'true'
            env.WORKERS_CHANGED = 'true'
          } else {
            def changed = sh(script: "git diff --name-only ${env.LAST_GOOD} ${env.DEPLOY_COMMIT}", returnStdout: true).trim().readLines()
            env.CLIENT_CHANGED  = changed.any { it.startsWith('client/') } ? 'true' : 'false'
            env.SERVER_CHANGED  = changed.any { it.startsWith('server/') } ? 'true' : 'false'
            env.WORKERS_CHANGED = changed.any { it.startsWith('infra/cloudflare/') } ? 'true' : 'false'
          }
          echo "Client changed: ${env.CLIENT_CHANGED}, Server changed: ${env.SERVER_CHANGED}, Cloudflare workers changed: ${env.WORKERS_CHANGED}"

          // Shared by the server AND client release names:
          //   <N>-<commit>-<YYYYMMDD-HHMM IST>-<developer>
          // developer = author of the latest non-merge commit (who wrote the
          // code, not who clicked Merge).
          env.COMMIT7 = env.DEPLOY_COMMIT.take(7)
          env.STAMP   = sh(script: 'TZ=Asia/Kolkata date +%Y%m%d-%H%M', returnStdout: true).trim()
          env.DEV     = sh(script: "git log -1 --no-merges --format=%an ${env.DEPLOY_COMMIT} | tr 'A-Z' 'a-z' | tr -cs 'a-z0-9' '-' | sed 's/^-//; s/-\$//' | cut -c1-30", returnStdout: true).trim() ?: 'unknown'
          // Who/what started this build — shown in the admin panel history.
          def causes = 'unknown'
          try { causes = currentBuild.getBuildCauses().collect { it.shortDescription }.join('; ') ?: 'unknown' } catch (e) { echo "Could not read build causes: ${e.message}" }
          env.TRIGGERED_BY = params.TRIGGERED_BY ?: (byTimer ? 'Nightly SEO rebuild (21:30 IST, automatic)' : causes)
        }
      }
    }

    // DB snapshot, part 1: start it now so it runs in parallel with the builds
    // (a snapshot takes 1–2 min; the builds take longer). Only when the backend
    // changes — only backend code changes data. Never blocks the deploy.
    stage('Start DB snapshot') {
      when { environment name: 'SERVER_CHANGED', value: 'true' }
      steps {
        script {
          env.LAST_STAGE = 'Start DB snapshot'
          env.DB_SNAPSHOT = ''
          env.DB_SNAPSHOT_STATUS = 'failed'
          withCredentials([
            string(credentialsId: 'INFISICAL_CLIENT_ID', variable: 'INFISICAL_CLIENT_ID'),
            string(credentialsId: 'INFISICAL_CLIENT_SECRET', variable: 'INFISICAL_CLIENT_SECRET'),
          ]) {
            def rc = sh(returnStatus: true, script: '''
              set +x
              rm -f .db_snapshot_folder
              export INFISICAL_TOKEN="$(infisical login --method=universal-auth \
                --client-id="$INFISICAL_CLIENT_ID" --client-secret="$INFISICAL_CLIENT_SECRET" --silent --plain)"
              [ -n "$INFISICAL_TOKEN" ] || { echo "Infisical login failed"; exit 1; }
              SECRET="$(infisical secrets get TIME_MACHINE_SECRET --projectId="$INFISICAL_PROJECT_ID" --env=prod --path=/admin/server --plain --silent)"
              unset INFISICAL_TOKEN
              [ -n "$SECRET" ] || { echo "TIME_MACHINE_SECRET not readable from Infisical"; exit 1; }
              RESP="$(curl -fsS -m 90 --retry 2 -X POST "$ADMIN_API/releases/hooks/db-snapshot" \
                -H "x-deploy-secret: $SECRET" -H "Content-Type: application/json" \
                --data "{\\"reason\\":\\"predeploy-$COMMIT7\\"}")" || { echo "Snapshot request to admin API failed"; exit 1; }
              FOLDER="$(echo "$RESP" | node jenkins/scripts/json-field.mjs folder)"
              [ -n "$FOLDER" ] || { echo "Admin API did not return a snapshot folder"; exit 1; }
              echo "$FOLDER" > .db_snapshot_folder
              echo "DB snapshot started (runs while we build): $FOLDER"
            ''')
            if (rc != 0) echo "WARNING: could not start the pre-deploy DB snapshot — deploying anyway; the last nightly snapshot is the fallback."
          }
          env.DB_SNAPSHOT = fileExists('.db_snapshot_folder') ? readFile('.db_snapshot_folder').trim() : ''
        }
      }
    }

    // Build first, deploy nothing yet: if the build fails, prod is untouched.
    stage('Build client') {
      when { environment name: 'CLIENT_CHANGED', value: 'true' }
      steps {
        script { env.LAST_STAGE = 'Build client' }
        dir('client') {
          sh 'npm ci --legacy-peer-deps'
          withCredentials([
            string(credentialsId: 'INFISICAL_CLIENT_ID', variable: 'INFISICAL_CLIENT_ID'),
            string(credentialsId: 'INFISICAL_CLIENT_SECRET', variable: 'INFISICAL_CLIENT_SECRET'),
          ]) {
            sh '''
              set +x
              export INFISICAL_TOKEN="$(infisical login --method=universal-auth \
                --client-id="$INFISICAL_CLIENT_ID" --client-secret="$INFISICAL_CLIENT_SECRET" \
                --silent --plain)"
              [ -n "$INFISICAL_TOKEN" ] || { echo "Infisical login failed"; exit 1; }

              # Key NAMES only (values never printed). Vite silently builds with
              # an empty value when a key is missing, so check before building.
              KEYS="$(infisical export --projectId="$INFISICAL_PROJECT_ID" --env=prod --path=/user/client --format=dotenv | cut -d= -f1)"
              for k in VITE_API_BASE_URL VITE_APP_ENV VITE_DOMAIN_BASE_URL VITE_GOOGLE_CLIENT_ID \
                       VITE_GOOGLE_MAPS_API_KEY VITE_GTM_ID VITE_ENABLE_ANALYTICS VITE_META_PIXEL_ID; do
                echo "$KEYS" | grep -qx "$k" || { echo "MISSING in Infisical prod /user/client: $k"; exit 1; }
              done
              # Optional: unset means the feature is off (same as before).
              for k in VITE_GOOGLE_ADS_ID VITE_GADS_LABEL_PURCHASE VITE_MAGIC_CHECKOUT_ENABLED; do
                echo "$KEYS" | grep -qx "$k" || echo "WARNING: $k not set in Infisical — that feature is OFF in this build"
              done

              export NODE_OPTIONS=--max-old-space-size=768
              # build:prod = vite build + scripts/prerender.mjs (SEO product
              # pages from the live feed → dist-prerender/, plus sitemap,
              # robots.txt, llms.txt). Prerender never fails the build.
              infisical run --projectId="$INFISICAL_PROJECT_ID" --env=prod --path=/user/client \
                -- npm run build:prod
              unset INFISICAL_TOKEN
            '''
          }
          // No robots "Disallow" here — that is staging-only. robots.txt for
          // prod is generated by prerender.mjs.
          sh 'test -f dist/index.html'
        }
        // Client release artifact (dist + prerendered pages) → S3 BEFORE the
        // client goes live, so any client version can be put back later from
        // the admin panel (jenkins/prod-rollback.Jenkinsfile).
        script {
          def last = sh(script: '''aws s3 ls "s3://$ARTIFACTS_BUCKET/prod/client/" | awk '{print $4}' | sed -n 's/^client-\\([0-9]*\\)-.*/\\1/p' | sort -n | tail -1 || true''', returnStdout: true).trim()
          env.CLIENT_RELEASE  = "${String.format('%03d', (last ? last.toInteger() : 0) + 1)}-${env.COMMIT7}-${env.STAMP}-${env.DEV}"
          env.CLIENT_ARTIFACT = "client-${env.CLIENT_RELEASE}.tar.gz"
        }
        sh '''
          tar -czf "$CLIENT_ARTIFACT" -C client dist dist-prerender 2>/dev/null \
            || tar -czf "$CLIENT_ARTIFACT" -C client dist
          aws s3 cp "$CLIENT_ARTIFACT" "s3://$ARTIFACTS_BUCKET/prod/client/$CLIENT_ARTIFACT" --only-show-errors
          echo "Client artifact stored: s3://$ARTIFACTS_BUCKET/prod/client/$CLIENT_ARTIFACT"
        '''
      }
    }

    // Release artifact (DEPLOYMENT_ARCHITECTURE.md §4): the whole server incl.
    // node_modules, built HERE (not on the prod box), checked for secrets and
    // stored in S3 BEFORE prod is touched. No artifact → no deploy (rule 1).
    stage('Build server release') {
      when { environment name: 'SERVER_CHANGED', value: 'true' }
      steps {
        script { env.LAST_STAGE = 'Build server release' }
        script {
          // node_modules (bcrypt is native) must be built with prod's exact
          // Node version. The agent's own Node (used for the client build) is
          // left alone; prod's version is downloaded once into a cache dir.
          env.PROD_NODE = sh(script: 'ssh $SSH_OPTS "$PROD_HOST" "node -v"', returnStdout: true).trim()
          if (!(env.PROD_NODE ==~ /v\d+\.\d+\.\d+/)) { error "Could not read prod Node version: '${env.PROD_NODE}'" }
          env.SERVER_NODE_BIN = "/home/ubuntu/.cache/jenkins-node/node-${env.PROD_NODE}-linux-x64/bin"
          sh '''
            if [ ! -x "$SERVER_NODE_BIN/node" ]; then
              mkdir -p /home/ubuntu/.cache/jenkins-node
              curl -fsSL "https://nodejs.org/dist/$PROD_NODE/node-$PROD_NODE-linux-x64.tar.xz" \
                | tar -xJ -C /home/ubuntu/.cache/jenkins-node
            fi
            echo "Server build uses Node $("$SERVER_NODE_BIN/node" -v) (prod runs $PROD_NODE)"
          '''
          // Release name: <N>-<commit>-<YYYYMMDD-HHMM IST>-<developer>
          //   e.g. 003-4ab8075-20260928-0422-joey
          // N (leading number) keeps releases in order for cleanup/rollback.
          def last = sh(script: '''ssh $SSH_OPTS "$PROD_HOST" "ls -1 $PROD_BASE/releases 2>/dev/null" | grep -oE '^[0-9]+' | sort -n | tail -1 || true''', returnStdout: true).trim()
          def num   = String.format('%03d', (last ? last.toInteger() : 0) + 1)
          env.RELEASE  = "${num}-${env.COMMIT7}-${env.STAMP}-${env.DEV}"
          env.ARTIFACT = "server-${env.RELEASE}.tar.gz"
          echo "Building release ${env.RELEASE} → ${env.ARTIFACT}"
        }
        dir('server') {
          sh 'PATH="$SERVER_NODE_BIN:$PATH" npm ci --omit=dev --legacy-peer-deps'
        }
        sh '''
          echo "$RELEASE $DEPLOY_COMMIT $(date -u +%FT%TZ)" > server/RELEASE
          tar -czf "$ARTIFACT" -C server --exclude='.env' --exclude='.env.*' --exclude='.git' .
          # Rule 2: an artifact must never carry secrets.
          if tar -tzf "$ARTIFACT" | grep -iE '(^|/)\\.env($|\\.)|\\.pem$|id_rsa'; then
            echo "SECRET-LIKE FILE IN ARTIFACT — aborting"; exit 1
          fi
          aws s3 cp "$ARTIFACT" "s3://$ARTIFACTS_BUCKET/prod/server/$ARTIFACT" --only-show-errors
          echo "Artifact stored: s3://$ARTIFACTS_BUCKET/prod/server/$ARTIFACT"

          # One-time layout move: server artifacts made before prod/server/
          # existed sit in prod/. Copy any missing ones across (copy, not move —
          # Jenkins' AWS user can't delete; the 30-day lifecycle clears prod/).
          aws s3 ls "s3://$ARTIFACTS_BUCKET/prod/" | awk '{print $4}' | grep -E '^server-.*[.]tar[.]gz$' | while read -r f; do
            aws s3 ls "s3://$ARTIFACTS_BUCKET/prod/server/$f" >/dev/null 2>&1 \
              || aws s3 cp "s3://$ARTIFACTS_BUCKET/prod/$f" "s3://$ARTIFACTS_BUCKET/prod/server/$f" --only-show-errors
          done || true
        '''
      }
    }

    // DB snapshot, part 2: make sure the snapshot started before the builds has
    // finished before the server switches. Usually already done by now.
    stage('Wait for DB snapshot') {
      when { expression { env.SERVER_CHANGED == 'true' && env.DB_SNAPSHOT } }
      steps {
        script {
          env.LAST_STAGE = 'Wait for DB snapshot'
          def rc = 1
          withCredentials([
            string(credentialsId: 'INFISICAL_CLIENT_ID', variable: 'INFISICAL_CLIENT_ID'),
            string(credentialsId: 'INFISICAL_CLIENT_SECRET', variable: 'INFISICAL_CLIENT_SECRET'),
          ]) {
            rc = sh(returnStatus: true, script: '''
              set +x
              export INFISICAL_TOKEN="$(infisical login --method=universal-auth \
                --client-id="$INFISICAL_CLIENT_ID" --client-secret="$INFISICAL_CLIENT_SECRET" --silent --plain)"
              SECRET="$(infisical secrets get TIME_MACHINE_SECRET --projectId="$INFISICAL_PROJECT_ID" --env=prod --path=/admin/server --plain --silent)"
              unset INFISICAL_TOKEN
              [ -n "$SECRET" ] || { echo "TIME_MACHINE_SECRET not readable from Infisical"; exit 1; }
              for i in $(seq 1 36); do   # up to ~6 minutes (normally 0–1 checks)
                ST="$(curl -fsS -m 30 -G "$ADMIN_API/releases/hooks/db-snapshot" --data-urlencode "folder=$DB_SNAPSHOT" \
                  -H "x-deploy-secret: $SECRET" | node jenkins/scripts/json-field.mjs status)" || ST="unreachable"
                echo "  snapshot $DB_SNAPSHOT: $ST"
                [ "$ST" = "success" ] && exit 0
                [ "$ST" = "failed" ] && exit 2
                sleep 10
              done
              echo "Snapshot did not finish in time"; exit 3
            ''')
          }
          env.DB_SNAPSHOT_STATUS = rc == 0 ? 'success' : 'failed'
          if (rc == 0) {
            echo "DB SNAPSHOT OK: ${env.DB_SNAPSHOT}"
          } else {
            echo "WARNING: pre-deploy DB snapshot FAILED (exit ${rc}) — deploying anyway; the last nightly snapshot is the fallback."
          }
        }
      }
    }

    // Server before client: the new frontend may call new API routes.
    // Layout (§3): releases/<N> immutable, shared/.env.production, current →
    // releases/<N>. Going live = moving the symlink; a failed health check
    // moves it back automatically.
    stage('Deploy server') {
      when { environment name: 'SERVER_CHANGED', value: 'true' }
      steps {
        script { env.LAST_STAGE = 'Deploy server' }
        sh '''
          scp $SSH_OPTS "$ARTIFACT" "$PROD_HOST:$PROD_BASE/artifacts/$ARTIFACT"

          ssh $SSH_OPTS "$PROD_HOST" "RELEASE=$RELEASE ARTIFACT=$ARTIFACT BASE=$PROD_BASE bash -s" <<'REMOTE'
            set -euo pipefail
            cd "$BASE"
            # Roll back to what pm2 is ACTUALLY running, not just where `current`
            # points — on the first release deploy pm2 still runs from server/
            # while `current` points at the older releases/001.
            PM2_CWD="$(pm2 jlist 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const a=JSON.parse(s).find(p=>p.name==="urbannook-server");console.log(a?a.pm2_env.pm_cwd:"")}catch{console.log("")}})')"
            if [ -n "$PM2_CWD" ]; then PREV="$(readlink -f "$PM2_CWD")"; else PREV="$(readlink -f current || true)"; fi
            echo "Live before deploy: ${PREV:-none}"

            mkdir "releases/$RELEASE"          # fails if it exists — releases are never reused
            tar -xzf "artifacts/$ARTIFACT" -C "releases/$RELEASE"
            ln -s "$BASE/shared/.env.production" "releases/$RELEASE/.env.production"

            switch_to() {
              ln -sfn "$1" current.tmp && mv -Tf current.tmp current
              pm2 delete urbannook-server >/dev/null 2>&1 || true
              pm2 start "$BASE/current/ecosystem.prod.config.cjs"
              pm2 save
            }
            healthy() {
              for i in $(seq 1 20); do
                curl -fsS -o /dev/null http://localhost:8000/health && return 0
                sleep 3
              done
              return 1
            }

            switch_to "$BASE/releases/$RELEASE"
            if healthy; then
              echo "HEALTH OK — release $RELEASE is live"
            else
              echo "HEALTH CHECK FAILED for release $RELEASE"
              pm2 logs urbannook-server --lines 40 --nostream || true
              if [ -n "$PREV" ] && [ -d "$PREV" ]; then
                echo "Rolling back to $PREV"
                switch_to "$PREV"
                healthy && echo "ROLLBACK OK — previous release is live" || echo "ROLLBACK ALSO UNHEALTHY — check prod now"
              fi
              exit 1
            fi

            # Keep the last 5 releases and local artifacts (rule 5). Never the live one.
            LIVE="$(readlink -f current)"
            ls -1 releases | grep -E '^[0-9]+' | sort -n | head -n -5 | while read -r r; do
              [ "$BASE/releases/$r" = "$LIVE" ] || rm -rf "releases/$r"
            done || true   # cleanup must never fail a deploy that is already live
            ls -1t artifacts/*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm -f || true
REMOTE
        '''
        // Record the new live server release for the admin panel.
        sh 'node jenkins/scripts/release-state.mjs server deploy "$RELEASE" "$DEPLOY_COMMIT" "$DEV" "$TRIGGERED_BY" "$JOB_NAME" "$BUILD_NUMBER" || echo "WARNING: could not update prod/state.json — admin panel may show an old live release"'
      }
    }

    // Same order as the GitHub Actions workflow: hashed assets first, then
    // index.html / sw.js with no-cache, so users never get a half-deployed app.
    // Cloudflare Workers (code in infra/cloudflare/) — only when that folder
    // changed. Runs before 'Deploy client' so its cache purge covers the new
    // worker too. The wrangler configs keep dashboard variables (keep_vars)
    // and never touch secrets; routes/custom domains are declared in them.
    stage('Deploy workers') {
      when { environment name: 'WORKERS_CHANGED', value: 'true' }
      steps {
        script { env.LAST_STAGE = 'Deploy workers' }
        withCredentials([
          string(credentialsId: 'CLOUDFLARE_WORKERS_TOKEN', variable: 'CLOUDFLARE_API_TOKEN'),
          string(credentialsId: 'CLOUDFLARE_ACCOUNT_ID', variable: 'CLOUDFLARE_ACCOUNT_ID'),
        ]) {
          dir('infra/cloudflare') {
            sh '''
              set +x
              for cfg in wrangler.s3-proxy-prod.toml wrangler.assets-proxy-prod.toml; do
                echo "Deploying worker from $cfg"
                npx --yes wrangler@4 deploy --config "$cfg"
              done
            '''
          }
        }
        // Smoke test through the NEW workers (?smoke= bypasses Cloudflare's
        // cache; the workers ignore the query string). If anything is wrong,
        // both workers go back to their previous version automatically.
        script {
          def ok = sh(returnStatus: true, script: '''
            set -e
            T=$(date +%s)
            # Website: real HTML, and the JS bundle it references loads.
            CT=$(curl -fsS -o /tmp/smoke-index.html -w "%{content_type}" "https://www.urbannook.in/?smoke=$T")
            echo "$CT" | grep -q "text/html" || { echo "index: wrong content-type $CT"; exit 1; }
            JS=$(grep -o '/assets/[^"]*\\.js' /tmp/smoke-index.html | head -1)
            [ -n "$JS" ] || { echo "index: no JS bundle referenced"; exit 1; }
            curl -fsS -o /dev/null "https://www.urbannook.in$JS?smoke=$T"
            curl -fsS -o /dev/null "https://www.urbannook.in/sitemap.xml?smoke=$T"
            # Images: any 2xx/403/404 means the worker signs and reaches S3; 5xx = broken.
            C=$(curl -s -o /dev/null -w "%{http_code}" "https://assets-prod.urbannook.in/__smoke_$T.png")
            [ "$C" -lt 500 ] || { echo "assets worker returned $C"; exit 1; }
            echo "SMOKE OK"
          ''')
          if (ok != 0) {
            withCredentials([
              string(credentialsId: 'CLOUDFLARE_WORKERS_TOKEN', variable: 'CLOUDFLARE_API_TOKEN'),
              string(credentialsId: 'CLOUDFLARE_ACCOUNT_ID', variable: 'CLOUDFLARE_ACCOUNT_ID'),
            ]) {
              sh '''
                set +x
                for w in urbannook-s3-proxy-prod urbannook-assets-proxy-prod; do
                  npx --yes wrangler@4 rollback --name "$w" --message "Jenkins smoke test failed" --yes \
                    || echo "ROLLBACK FAILED for $w — roll back in Cloudflare dashboard NOW"
                done
              '''
            }
            error 'Worker smoke test failed — workers rolled back to the previous version.'
          }
        }
      }
    }

    stage('Deploy client') {
      when { environment name: 'CLIENT_CHANGED', value: 'true' }
      steps {
        script { env.LAST_STAGE = 'Deploy client' }
        // SEO phase 0 upload steps (unchanged) live in jenkins/scripts/upload-client.sh,
        // shared with the rollback job so an old client goes up exactly the same way.
        sh 'bash jenkins/scripts/upload-client.sh client/dist client/dist-prerender "$S3_BUCKET"'
        // The site is served by a Cloudflare Worker (not CloudFront), so the
        // cache to clear is Cloudflare's. No CloudFront invalidation needed.
        withCredentials([
          string(credentialsId: 'URBANNOOK_PROD_CF_TOKEN', variable: 'CF_TOKEN'),
          string(credentialsId: 'URBANNOOK_PROD_CF_ZONE_ID', variable: 'CF_ZONE'),
        ]) {
          sh '''
            set +x
            curl -fsS -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE/purge_cache" \
              -H "Authorization: Bearer $CF_TOKEN" -H "Content-Type: application/json" \
              --data '{"purge_everything":true}' -o /dev/null && echo "Cloudflare cache purged"
          '''
        }
        // Record the new live client release for the admin panel.
        sh 'node jenkins/scripts/release-state.mjs client deploy "$CLIENT_RELEASE" "$DEPLOY_COMMIT" "$DEV" "$TRIGGERED_BY" "$JOB_NAME" "$BUILD_NUMBER" || echo "WARNING: could not update prod/state.json — admin panel may show an old live release"'
      }
    }
  }

  post {
    success {
      echo "PROD DEPLOY OK: ${env.DEPLOY_COMMIT}"
      script { writeBundle('success') }
    }
    failure {
      echo "PROD DEPLOY FAILED at '${env.LAST_STAGE ?: 'start'}' — site keeps running the previous version for any stage that did not run."
      script { writeBundle('failed') }
    }
    // cleanup runs LAST (after success/failure) — 'always' would run first and
    // delete the scripts the bundle step needs.
    cleanup { cleanWs(deleteDirs: true, notFailBuild: true) }
  }
}
