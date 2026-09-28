// ============================================================================
// PRODUCTION ROLLBACK / SWITCH RELEASE — storefront (urbannook.in)
// Jenkins job: UrbanNook-Prod-Rollback (Pipeline script from SCM, branch main,
// script path jenkins/prod-rollback.Jenkinsfile). Manual only — started from
// the admin panel (Time Machine → Releases) or "Build with Parameters".
//
// Puts ONE component back on an existing release. Nothing is built here:
//   server → an existing release folder on prod (or its artifact from S3 if
//            the folder was cleaned up), `current` switched, pm2 restarted,
//            /health checked — on failure prod goes back to what it ran before.
//   client → a client artifact from S3, uploaded with the same steps as a
//            normal deploy (jenkins/scripts/upload-client.sh) + cache purge.
// Server and client are independent, so "client release X + server release Y"
// (mix deploy) is two runs of this job.
//
// Every run updates s3://urbannook-release-artifacts/prod/state.json, which
// the admin panel reads to show what is live.
//
// See DEPLOYMENT_ARCHITECTURE.md before changing this file.
// ============================================================================
pipeline {
  agent { label 'staging' }

  options {
    disableConcurrentBuilds()
    timestamps()
    timeout(time: 20, unit: 'MINUTES')
  }

  parameters {
    choice(name: 'COMPONENT', choices: ['server', 'client'], description: 'What to switch')
    string(name: 'RELEASE', defaultValue: '',
      description: 'Release name, e.g. 003-4ab8075-20260928-0422-joey (server) or client release name')
    string(name: 'REASON', defaultValue: '', description: 'Why (shown in history)')
    string(name: 'TRIGGERED_BY', defaultValue: '', description: 'Set by the admin panel (admin email)')
  }

  environment {
    S3_BUCKET        = 'urbannook-prod-frontend'
    ARTIFACTS_BUCKET = 'urbannook-release-artifacts'
    PROD_HOST        = 'ubuntu@172.31.13.243'
    PROD_BASE        = '/home/ubuntu/urbannook-prod'
    SSH_OPTS         = '-i /home/ubuntu/.ssh/prod_deploy -o StrictHostKeyChecking=yes -o BatchMode=yes'
  }

  stages {
    stage('Validate') {
      steps {
        script {
          // Only plain release names — the value ends up in shell commands.
          if (!(params.RELEASE ==~ /[0-9]{3}[A-Za-z0-9._-]*/)) {
            error "Invalid RELEASE '${params.RELEASE}'"
          }
          env.RELEASE      = params.RELEASE
          def causes = 'unknown'
          try { causes = currentBuild.getBuildCauses().collect { it.shortDescription }.join('; ') ?: 'unknown' } catch (e) { echo "Could not read build causes: ${e.message}" }
          env.TRIGGERED_BY = params.TRIGGERED_BY ?: causes
          currentBuild.displayName = "#${env.BUILD_NUMBER} ${params.COMPONENT} → ${params.RELEASE}"
          currentBuild.description = "${env.TRIGGERED_BY}${params.REASON ? ' — ' + params.REASON : ''}"
        }
        // Scripts (upload-client.sh, release-state.mjs) come from main.
        checkout([$class: 'GitSCM', branches: [[name: '*/main']],
          userRemoteConfigs: [[url: 'git@github.com:swapnil0000/urbannook.git', credentialsId: 'urbannook-agent-key']]])
      }
    }

    stage('Switch server') {
      when { expression { params.COMPONENT == 'server' } }
      steps {
        sh '''
          # Folder still on prod? Otherwise bring the artifact back from S3
          # (level 2/3 restore) — prod keeps only the last 5 releases.
          if ! ssh $SSH_OPTS "$PROD_HOST" "test -d $PROD_BASE/releases/$RELEASE"; then
            ART="$(aws s3 ls "s3://$ARTIFACTS_BUCKET/prod/" | awk '{print $4}' | grep -E "^server-$RELEASE(-.*)?\\.tar\\.gz$" | head -1)"
            [ -n "$ART" ] || { echo "Release $RELEASE not on prod and no artifact in S3"; exit 1; }
            echo "Restoring $RELEASE from s3://$ARTIFACTS_BUCKET/prod/$ART"
            aws s3 cp "s3://$ARTIFACTS_BUCKET/prod/$ART" "$ART" --only-show-errors
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
          COMMIT="$(echo "$RELEASE" | cut -d- -f2)"
          DEV="$(echo "$RELEASE" | cut -d- -f5-)"
          node jenkins/scripts/release-state.mjs server rollback "$RELEASE" "$COMMIT" "$DEV" "$TRIGGERED_BY" "$JOB_NAME" "$BUILD_NUMBER" || echo "WARNING: could not update prod/state.json"
        '''
      }
    }

    stage('Switch client') {
      when { expression { params.COMPONENT == 'client' } }
      steps {
        sh '''
          ART="client-$RELEASE.tar.gz"
          aws s3 cp "s3://$ARTIFACTS_BUCKET/prod/client/$ART" "$ART" --only-show-errors \
            || { echo "Client release $RELEASE not found in S3"; exit 1; }
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
          COMMIT="$(echo "$RELEASE" | cut -d- -f2)"
          DEV="$(echo "$RELEASE" | cut -d- -f5-)"
          node jenkins/scripts/release-state.mjs client rollback "$RELEASE" "$COMMIT" "$DEV" "$TRIGGERED_BY" "$JOB_NAME" "$BUILD_NUMBER" || echo "WARNING: could not update prod/state.json"
        '''
      }
    }
  }

  post {
    success { echo "ROLLBACK OK: ${params.COMPONENT} → ${params.RELEASE}" }
    failure { echo "ROLLBACK FAILED: ${params.COMPONENT} → ${params.RELEASE} — see the log above; prod stays on what it ran before for any step that did not complete." }
    always  { cleanWs(deleteDirs: true, notFailBuild: true) }
  }
}
