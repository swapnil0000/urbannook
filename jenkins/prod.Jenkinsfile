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
//
// FLOW (each step only runs if the previous one passed)
//   1. Checkout main
//   2. Detect what changed since the LAST SUCCESSFUL prod deploy
//   3. Build the frontend           ← nothing deployed yet; a failure here
//   4. Build the server release       leaves prod completely untouched
//      (tar.gz incl. node_modules → S3)
//   5. Deploy the release: extract to releases/<N>, move `current`, restart,
//      health check — on failure `current` goes back to the previous release
//   6. Cloudflare workers (only if infra/cloudflare/ changed)
//   7. Upload the frontend + purge Cloudflare cache
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
        }
      }
    }

    // Build first, deploy nothing yet: if the build fails, prod is untouched.
    stage('Build client') {
      when { environment name: 'CLIENT_CHANGED', value: 'true' }
      steps {
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
      }
    }

    // Release artifact (DEPLOYMENT_ARCHITECTURE.md §4): the whole server incl.
    // node_modules, built HERE (not on the prod box), checked for secrets and
    // stored in S3 BEFORE prod is touched. No artifact → no deploy (rule 1).
    stage('Build server release') {
      when { environment name: 'SERVER_CHANGED', value: 'true' }
      steps {
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
          //   e.g. 003-ffd51fe-20260928-0356-dheeraj-patnaik
          // N (leading number) keeps releases in order for cleanup/rollback;
          // developer = author of the latest non-merge commit (who wrote the
          // code, not who clicked Merge).
          def last = sh(script: '''ssh $SSH_OPTS "$PROD_HOST" "ls -1 $PROD_BASE/releases 2>/dev/null" | grep -oE '^[0-9]+' | sort -n | tail -1 || true''', returnStdout: true).trim()
          def num   = String.format('%03d', (last ? last.toInteger() : 0) + 1)
          def stamp = sh(script: 'TZ=Asia/Kolkata date +%Y%m%d-%H%M', returnStdout: true).trim()
          def dev   = sh(script: "git log -1 --no-merges --format=%an ${env.DEPLOY_COMMIT} | tr 'A-Z' 'a-z' | tr -cs 'a-z0-9' '-' | sed 's/^-//; s/-\$//' | cut -c1-30", returnStdout: true).trim() ?: 'unknown'
          env.RELEASE  = "${num}-${env.DEPLOY_COMMIT.take(7)}-${stamp}-${dev}"
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
          aws s3 cp "$ARTIFACT" "s3://$ARTIFACTS_BUCKET/prod/$ARTIFACT" --only-show-errors
          echo "Artifact stored: s3://$ARTIFACTS_BUCKET/prod/$ARTIFACT"
        '''
      }
    }

    // Server before client: the new frontend may call new API routes.
    // Layout (§3): releases/<N> immutable, shared/.env.production, current →
    // releases/<N>. Going live = moving the symlink; a failed health check
    // moves it back automatically.
    stage('Deploy server') {
      when { environment name: 'SERVER_CHANGED', value: 'true' }
      steps {
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
        // Mirrors .github/workflows/prod-deploy.yml (SEO phase 0) step by step.
        sh '''
          BUCKET="s3://$S3_BUCKET"

          # 1. Hashed assets (long cache). index.html, sw.js and the
          #    prerendered product/* pages are handled separately below —
          #    product/* is excluded so this --delete never wipes them.
          aws s3 sync client/dist/ "$BUCKET" --delete \
            --exclude "index.html" --exclude "sw.js" --exclude "product/*" --only-show-errors

          # 2. index.html + sw.js: no-cache, so users never load a stale shell.
          aws s3 cp client/dist/index.html "$BUCKET/index.html" --metadata-directive REPLACE \
            --cache-control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
          if [ -f client/dist/sw.js ]; then
            aws s3 cp client/dist/sw.js "$BUCKET/sw.js" --metadata-directive REPLACE \
              --cache-control "no-store, no-cache, must-revalidate, max-age=0"
          fi

          # 3. Crawler files change every build: 1-hour cache.
          for f in robots.txt sitemap.xml llms.txt; do
            if [ -f "client/dist/$f" ]; then
              aws s3 cp "client/dist/$f" "$BUCKET/$f" --metadata-directive REPLACE \
                --cache-control "public, max-age=3600"
            fi
          done

          # 4. Prerendered product pages — extensionless keys served for
          #    /product/<id> and /product/<id>/<sku>. Kept in EXACT sync with
          #    this build (each page references this build's hashed JS, and the
          #    previous build's JS was just deleted). Deleted products are
          #    removed; if prerender produced nothing (feed down) all pages are
          #    removed and the SPA index.html serves those URLs as before.
          #    Pass 1 = product/<id> only, pass 2 = product/<id>/<sku> only.
          PR=client/dist-prerender
          mkdir -p "$PR/base/product" "$PR/variant/product"
          aws s3 sync "$PR/base/product/" "$BUCKET/product/" --delete --exclude "*/*" \
            --content-type "text/html; charset=utf-8" --cache-control "no-cache, max-age=0" --only-show-errors
          aws s3 sync "$PR/variant/product/" "$BUCKET/product/" --delete --exclude "*" --include "*/*" \
            --content-type "text/html; charset=utf-8" --cache-control "no-cache, max-age=0" --only-show-errors
        '''
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
      }
    }
  }

  post {
    success { echo "PROD DEPLOY OK: ${env.DEPLOY_COMMIT}" }
    failure { echo "PROD DEPLOY FAILED — site keeps running the previous version for any stage that did not run." }
    always  { cleanWs(deleteDirs: true, notFailBuild: true) }
  }
}
