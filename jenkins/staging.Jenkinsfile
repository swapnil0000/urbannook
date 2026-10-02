// ============================================================================
// STAGING DEPLOY — storefront (urbannook.online)
// Jenkins job: UrbanNook-Staging-Build (Pipeline script from SCM, branch
// staging, script path jenkins/staging.Jenkinsfile). Production has its own
// file: jenkins/prod.Jenkinsfile — keep the two separate on purpose.
//
// WHERE THINGS RUN vs WHERE THEY GO
//   Runs on : the Jenkins agent labelled 'staging' (the staging EC2).
//   Deploys : STAGING only, on the SAME machine —
//               frontend → S3 bucket urbannook-staging-frontend + Cloudflare
//                          cache purge for the staging zone
//               backend  → /home/ubuntu/urbannook-staging/server, served by
//                          the systemd service `urbannook-server`
//
// HOW THE STAGING BACKEND RUNS (important)
//   systemd unit `urbannook-server.service` runs
//     infisical run --env=staging --projectId=... --path=/user/server -- node src/server.js
//   It reads secrets from Infisical itself, on every start. So this pipeline
//   only copies the code and RESTARTS that service. It must NOT start the app
//   with pm2 — the old pipeline did, which (a) never replaced the running
//   systemd process, so new backend code didn't go live, and (b) made pm2
//   save every secret in plain text to ~/.pm2/dump.pm2.
//
// FIXES vs the old inline pipeline
//   - Changes are detected against the LAST SUCCESSFUL deploy, not HEAD~1
//     (multi-commit pushes / failed builds no longer skip changes).
//   - Frontend is built with ONE Infisical call using the Jenkins machine
//     identity, running vite directly (no nested infisical that relied on a
//     personal login).
//   - Frontend is built before anything is deployed.
//   - index.html / sw.js uploaded with no-cache (same as prod).
//   - npm ci for the frontend (exact lockfile versions).
//   - Backend health check after restart.
//
// STAGING-ONLY on purpose: robots.txt "Disallow: /" (keeps staging out of
// Google). Never copy that into prod.jenkinsfile.
//
// SECRETS (none are stored in this file)
//   - Frontend build values : Infisical staging /user/client via Jenkins creds
//     INFISICAL_CLIENT_ID / INFISICAL_CLIENT_SECRET.
//   - Backend secrets       : loaded by the systemd service, not here.
//   - Cloudflare            : Jenkins creds cloudflare-token-id and
//     URBANNOOK_STAGING_CF_ZONE_ID.
//
// See DEPLOYMENT_ARCHITECTURE.md before changing this file.
// ============================================================================
pipeline {
  // Label of the Jenkins node that RUNS the build (this staging EC2).
  agent { label 'staging' }

  // GitHub webhook → auto-deploys the default branch (staging) on push.
  // Any other branch: "Build with Parameters" → TARGET_BRANCH.
  triggers { githubPush() }

  options {
    disableConcurrentBuilds()
    timestamps()
    timeout(time: 30, unit: 'MINUTES')
  }

  parameters {
    string(name: 'TARGET_BRANCH', defaultValue: 'staging', description: 'Branch to deploy to STAGING')
    booleanParam(name: 'DEPLOY_ALL', defaultValue: false,
      description: 'Deploy client AND server even if they did not change since the last successful deploy')
  }

  // Deploy targets — every value here is STAGING.
  environment {
    INFISICAL_PROJECT_ID = '80b13bde-6879-405e-889f-2f9b28f4c0f4'
    S3_BUCKET            = 'urbannook-staging-frontend'
    STAGING_SERVER_DIR   = '/home/ubuntu/urbannook-staging/server'
    SERVICE_NAME         = 'urbannook-server'
  }

  stages {
    stage('Checkout') {
      steps {
        script {
          def scm = checkout([$class: 'GitSCM',
            branches: [[name: "*/${params.TARGET_BRANCH ?: 'staging'}"]],
            userRemoteConfigs: [[url: 'git@github.com:swapnil0000/urbannook.git', credentialsId: 'urbannook-agent-key']]])
          env.DEPLOY_COMMIT = scm.GIT_COMMIT
          env.LAST_GOOD     = scm.GIT_PREVIOUS_SUCCESSFUL_COMMIT ?: ''
          echo "Deploying ${params.TARGET_BRANCH} @ ${env.DEPLOY_COMMIT} (last successful staging deploy: ${env.LAST_GOOD ?: 'none'})"
        }
      }
    }

    // Compare against the last SUCCESSFUL deploy. No previous success or
    // DEPLOY_ALL → deploy both.
    stage('Detect changes') {
      steps {
        script {
          if (params.DEPLOY_ALL || !env.LAST_GOOD) {
            env.CLIENT_CHANGED = 'true'
            env.SERVER_CHANGED = 'true'
          } else {
            def changed = sh(script: "git diff --name-only ${env.LAST_GOOD} ${env.DEPLOY_COMMIT}", returnStdout: true).trim()
            env.CLIENT_CHANGED = changed.readLines().any { it.startsWith('client/') } ? 'true' : 'false'
            env.SERVER_CHANGED = changed.readLines().any { it.startsWith('server/') } ? 'true' : 'false'
          }
          echo "Client changed: ${env.CLIENT_CHANGED}, Server changed: ${env.SERVER_CHANGED}"
        }
      }
    }

    // Build first, deploy nothing yet.
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
              export NODE_OPTIONS=--max-old-space-size=768
              # vite directly — the staging branch's `build:staging` script wraps
              # its own `infisical run`, which would need a personal login.
              infisical run --projectId="$INFISICAL_PROJECT_ID" --env=staging --path=/user/client \
                -- npx vite build --mode staging
              unset INFISICAL_TOKEN
            '''
          }
          sh 'test -f dist/index.html'
          // STAGING ONLY: keep staging out of search engines.
          sh "printf 'User-agent: *\\nDisallow: /\\n' > dist/robots.txt"
        }
      }
    }

    // Server before client: the new frontend may call new API routes.
    stage('Deploy server') {
      when { environment name: 'SERVER_CHANGED', value: 'true' }
      steps {
        sh '''
          sudo rsync -a --delete \
            --exclude '.env' --exclude '.env.*' --exclude 'node_modules' --exclude '.git' \
            server/ "$STAGING_SERVER_DIR/"

          cd "$STAGING_SERVER_DIR"
          npm install --omit=dev --legacy-peer-deps

          # Secrets now come only from Infisical — no local .env.staging.
          sudo rm -f .env.staging

          # Restart the systemd service so the NEW code goes live. It re-reads
          # secrets from Infisical on start.
          sudo systemctl restart "$SERVICE_NAME"

          # Health check: up to ~60s.
          for i in $(seq 1 20); do
            if curl -fsS -o /dev/null http://localhost:8000/health; then
              echo "HEALTH OK"
              exit 0
            fi
            sleep 3
          done
          echo "HEALTH CHECK FAILED"
          sudo journalctl -u "$SERVICE_NAME" -n 40 --no-pager
          exit 1
        '''
      }
    }

    stage('Deploy client') {
      when { environment name: 'CLIENT_CHANGED', value: 'true' }
      steps {
        sh '''
          aws s3 sync client/dist/ "s3://$S3_BUCKET" --delete \
            --exclude "index.html" --exclude "sw.js" --only-show-errors
          aws s3 cp client/dist/index.html "s3://$S3_BUCKET/index.html" --metadata-directive REPLACE \
            --cache-control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
          if [ -f client/dist/sw.js ]; then
            aws s3 cp client/dist/sw.js "s3://$S3_BUCKET/sw.js" --metadata-directive REPLACE \
              --cache-control "no-store, no-cache, must-revalidate, max-age=0"
          fi
        '''
        withCredentials([
          string(credentialsId: 'cloudflare-token-id', variable: 'CF_TOKEN'),
          string(credentialsId: 'URBANNOOK_STAGING_CF_ZONE_ID', variable: 'CF_ZONE'),
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

    stage('Nothing to deploy') {
      when {
        allOf {
          environment name: 'CLIENT_CHANGED', value: 'false'
          environment name: 'SERVER_CHANGED', value: 'false'
        }
      }
      steps { echo 'No client or server changes since the last successful deploy.' }
    }
  }

  post {
    success { echo "STAGING DEPLOY OK: ${env.DEPLOY_COMMIT}" }
    failure { echo 'STAGING DEPLOY FAILED — check the failed stage above.' }
    always  { cleanWs(deleteDirs: true, notFailBuild: true) }
  }
}
