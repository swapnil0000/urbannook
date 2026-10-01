// ============================================================================
// PRODUCTION ROLLBACK / SWITCH RELEASE — storefront (urbannook.in)
// Jenkins job: UrbanNook-Prod-Rollback (Pipeline script from SCM, branch main,
// script path jenkins/prod-rollback.Jenkinsfile). Manual only — started from
// the admin panel (Time Machine) or "Build with Parameters".
//
// Puts server and/or client back on existing releases. Nothing is built here:
//   server → an existing release folder on prod (or its artifact from S3 if
//            the folder was cleaned up), `current` switched, pm2 restarted,
//            /health checked — on failure prod goes back to what it ran before.
//   client → a client artifact from S3, uploaded with the same steps as a
//            normal deploy (jenkins/scripts/upload-client.sh) + cache purge.
//   both   → server first, then client — used to restore a whole deploy
//            ("release bundle") from Time Machine → Deploy history.
// COMPONENT=server or client alone gives mix-and-match (client X + server Y).
//
// Data is never touched: DB snapshots are restored by hand
// (admin repo server/scripts/restore-db-backup.js).
//
// Every run updates s3://urbannook-release-artifacts/prod/state.json (what is
// live) and writes a release bundle (prod/bundles/<id>/, action "rollback").
//
// See DEPLOYMENT_ARCHITECTURE.md before changing this file.
// ============================================================================

// Release bundle for this rollback — same format as prod.Jenkinsfile's.
def writeBundle(String status) {
  if (!env.STAMP) return
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
        fi
        unset INFISICAL_TOKEN
      '''
    }
    withEnv(["BUNDLE_STATUS=${status}", "BUNDLE_STAMP=${env.STAMP}", "FAILED_STAGE=${env.LAST_STAGE ?: ''}",
             "BUNDLE_ACTION=rollback", "ENV_KEYS_FILE=env-keys-input.json",
             "RESTORED_BUNDLE=${params.BUNDLE ?: ''}",
             "RELEASE=${env.SERVER_REL ?: ''}", "CLIENT_RELEASE=${env.CLIENT_REL ?: ''}"]) {
      sh 'node jenkins/scripts/release-bundle.mjs'
    }
  } catch (e) {
    echo "WARNING: release bundle not written: ${e.message}"
  }
}

pipeline {
  agent { label 'staging' }

  options {
    disableConcurrentBuilds()
    timestamps()
    timeout(time: 25, unit: 'MINUTES')
  }

  parameters {
    choice(name: 'COMPONENT', choices: ['server', 'client', 'both'], description: 'What to switch')
    string(name: 'RELEASE', defaultValue: '',
      description: 'Server release (COMPONENT=server/both) or client release (COMPONENT=client), e.g. 004-85c138a-20260929-0025-joey')
    string(name: 'CLIENT_RELEASE', defaultValue: '', description: 'Client release when COMPONENT=both')
    string(name: 'BUNDLE', defaultValue: '', description: 'Bundle id being restored (set by the admin panel)')
    string(name: 'REASON', defaultValue: '', description: 'Why (shown in history)')
    string(name: 'TRIGGERED_BY', defaultValue: '', description: 'Set by the admin panel (admin email)')
  }

  environment {
    INFISICAL_PROJECT_ID = '80b13bde-6879-405e-889f-2f9b28f4c0f4'
    S3_BUCKET            = 'urbannook-prod-frontend'
    ARTIFACTS_BUCKET     = 'urbannook-release-artifacts'
    PROD_HOST            = 'ubuntu@172.31.13.243'
    PROD_BASE            = '/home/ubuntu/urbannook-prod'
    SSH_OPTS             = '-i /home/ubuntu/.ssh/prod_deploy -o StrictHostKeyChecking=yes -o BatchMode=yes'
  }

  stages {
    stage('Validate') {
      steps {
        script {
          env.LAST_STAGE = 'Validate'
          // Only plain release names — the values end up in shell commands.
          def ok = { String v -> v ==~ /[0-9]{3}[A-Za-z0-9._-]*/ }
          if (!ok(params.RELEASE ?: '')) error "Invalid RELEASE '${params.RELEASE}'"
          if (params.COMPONENT == 'both' && !ok(params.CLIENT_RELEASE ?: '')) error "COMPONENT=both needs a valid CLIENT_RELEASE"
          if (params.BUNDLE && !(params.BUNDLE ==~ /[0-9]{8}-[0-9]{4}-[A-Za-z0-9-]+/)) error "Invalid BUNDLE '${params.BUNDLE}'"

          env.SERVER_REL = params.COMPONENT in ['server', 'both'] ? params.RELEASE : ''
          env.CLIENT_REL = params.COMPONENT == 'client' ? params.RELEASE : (params.COMPONENT == 'both' ? params.CLIENT_RELEASE : '')

          def causes = 'unknown'
          try { causes = currentBuild.getBuildCauses().collect { it.shortDescription }.join('; ') ?: 'unknown' } catch (e) { echo "Could not read build causes: ${e.message}" }
          env.TRIGGERED_BY = params.TRIGGERED_BY ?: causes
          env.REASON = params.REASON ?: ''
          env.STAMP = sh(script: 'TZ=Asia/Kolkata date +%Y%m%d-%H%M', returnStdout: true).trim()
          // Bundle id uses the commit + developer of what goes live.
          def rel = env.SERVER_REL ?: env.CLIENT_REL
          env.DEPLOY_COMMIT = rel.tokenize('-').size() > 1 && rel.tokenize('-')[1] ==~ /[0-9a-f]{7}/ ? rel.tokenize('-')[1] : ''
          env.DEV = rel.tokenize('-').size() > 4 ? rel.tokenize('-').drop(4).join('-') : 'unknown'

          def what = [env.SERVER_REL ? "server → ${env.SERVER_REL.take(3)}" : null, env.CLIENT_REL ? "client → ${env.CLIENT_REL.take(3)}" : null].findAll().join(', ')
          currentBuild.displayName = "#${env.BUILD_NUMBER} ${params.BUNDLE ? 'restore ' : ''}${what}"
          currentBuild.description = "${env.TRIGGERED_BY}${params.REASON ? ' — ' + params.REASON : ''}"
        }
        // Scripts (upload-client.sh, release-state.mjs, release-bundle.mjs) come from main.
        checkout([$class: 'GitSCM', branches: [[name: '*/main']],
          userRemoteConfigs: [[url: 'git@github.com:swapnil0000/urbannook.git', credentialsId: 'urbannook-agent-key']]])
      }
    }

    stage('Switch server') {
      when { expression { env.SERVER_REL } }
      steps {
        script { env.LAST_STAGE = 'Switch server' }
        sh '''
          RELEASE="$SERVER_REL"
          # Folder still on prod? Otherwise bring the artifact back from S3
          # (level 2/3 restore) — prod keeps only the last 5 releases.
          # Artifacts live in prod/server/ (older ones may still be only in prod/).
          if ! ssh $SSH_OPTS "$PROD_HOST" "test -d $PROD_BASE/releases/$RELEASE"; then
            SRC=""
            for dir in prod/server prod; do
              ART="$(aws s3 ls "s3://$ARTIFACTS_BUCKET/$dir/" | awk '{print $4}' | grep -E "^server-$RELEASE(-.*)?[.]tar[.]gz$" | head -1)"
              [ -n "$ART" ] && { SRC="$dir"; break; }
            done
            [ -n "$SRC" ] || { echo "Release $RELEASE not on prod and no artifact in S3"; exit 1; }
            echo "Restoring $RELEASE from s3://$ARTIFACTS_BUCKET/$SRC/$ART"
            aws s3 cp "s3://$ARTIFACTS_BUCKET/$SRC/$ART" "$ART" --only-show-errors
            scp $SSH_OPTS "$ART" "$PROD_HOST:$PROD_BASE/artifacts/$ART"
            ssh $SSH_OPTS "$PROD_HOST" "set -e; cd $PROD_BASE; mkdir releases/$RELEASE; tar -xzf artifacts/$ART -C releases/$RELEASE; ln -sfn $PROD_BASE/shared/.env.production releases/$RELEASE/.env.production"
          fi

          ssh $SSH_OPTS "$PROD_HOST" "RELEASE=$RELEASE BASE=$PROD_BASE bash -s" <<'REMOTE'
            set -euo pipefail
            cd "$BASE"
            PM2_CWD="$(pm2 jlist 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const a=JSON.parse(s).find(p=>p.name==="urbannook-server");console.log(a?a.pm2_env.pm_cwd:"")}catch{console.log("")}})')"
            if [ -n "$PM2_CWD" ]; then PREV="$(readlink -f "$PM2_CWD")"; else PREV="$(readlink -f current || true)"; fi
            TARGET="$BASE/releases/$RELEASE"
            echo "Live now: ${PREV:-none}  →  switching to: $TARGET"
            [ "$PREV" != "$TARGET" ] || { echo "Already live — nothing to do"; exit 0; }

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

            switch_to "$TARGET"
            if healthy; then
              echo "HEALTH OK — server release $RELEASE is live"
            else
              echo "HEALTH CHECK FAILED for $RELEASE"
              pm2 logs urbannook-server --lines 40 --nostream || true
              if [ -n "$PREV" ] && [ -d "$PREV" ]; then
                echo "Going back to $PREV"
                switch_to "$PREV"
                healthy && echo "BACK ON PREVIOUS — OK" || echo "PREVIOUS ALSO UNHEALTHY — check prod now"
              fi
              exit 1
            fi
REMOTE
        '''
        sh '''
          COMMIT="$(echo "$SERVER_REL" | cut -d- -f2)"
          DEV="$(echo "$SERVER_REL" | cut -d- -f5-)"
          node jenkins/scripts/release-state.mjs server rollback "$SERVER_REL" "$COMMIT" "$DEV" "$TRIGGERED_BY" "$JOB_NAME" "$BUILD_NUMBER" || echo "WARNING: could not update prod/state.json"
        '''
      }
    }

    stage('Switch client') {
      when { expression { env.CLIENT_REL } }
      steps {
        script { env.LAST_STAGE = 'Switch client' }
        sh '''
          ART="client-$CLIENT_REL.tar.gz"
          aws s3 cp "s3://$ARTIFACTS_BUCKET/prod/client/$ART" "$ART" --only-show-errors \
            || { echo "Client release $CLIENT_REL not found in S3"; exit 1; }
          rm -rf restore && mkdir restore
          tar -xzf "$ART" -C restore
          test -f restore/dist/index.html
          bash jenkins/scripts/upload-client.sh restore/dist restore/dist-prerender "$S3_BUCKET"
        '''
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
        sh '''
          T=$(date +%s)
          curl -fsS -o /dev/null "https://www.urbannook.in/?smoke=$T" && echo "website OK"
          COMMIT="$(echo "$CLIENT_REL" | cut -d- -f2)"
          DEV="$(echo "$CLIENT_REL" | cut -d- -f5-)"
          node jenkins/scripts/release-state.mjs client rollback "$CLIENT_REL" "$COMMIT" "$DEV" "$TRIGGERED_BY" "$JOB_NAME" "$BUILD_NUMBER" || echo "WARNING: could not update prod/state.json"
        '''
      }
    }
  }

  post {
    success {
      echo "ROLLBACK OK: server=${env.SERVER_REL ?: '-'} client=${env.CLIENT_REL ?: '-'}"
      script { writeBundle('success') }
    }
    failure {
      echo "ROLLBACK FAILED at '${env.LAST_STAGE ?: 'start'}' — see the log above; prod stays on what it ran before for any step that did not complete."
      script { writeBundle('failed') }
    }
    // cleanup runs LAST — 'always' would run first and delete the bundle scripts.
    cleanup { cleanWs(deleteDirs: true, notFailBuild: true) }
  }
}
