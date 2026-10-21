#!/usr/bin/env bash
# Uploads a built storefront client to the prod frontend bucket.
# Used by BOTH jenkins/prod.Jenkinsfile (fresh build) and
# jenkins/prod-rollback.Jenkinsfile (old client release from S3), so a
# rolled-back client is uploaded exactly like a new one.
#
# The steps are the SEO phase 0 upload steps from the old
# .github/disabled/prod-deploy.yml, unchanged — do not reorder them.
#
# Usage: upload-client.sh <dist dir> <dist-prerender dir> <bucket name>
# The Cloudflare cache purge is done by the caller (needs Jenkins creds).
set -euo pipefail

DIST="$1"
PR="$2"
BUCKET="s3://$3"

[ -f "$DIST/index.html" ] || { echo "upload-client: $DIST/index.html missing"; exit 1; }

# 1. Hashed assets (long cache). index.html, sw.js and the rendered pages
#    (ssg/*, older product/*) are handled separately below — excluded so this
#    --delete never wipes them.
aws s3 sync "$DIST/" "$BUCKET" --delete \
  --exclude "index.html" --exclude "sw.js" --exclude "product/*" --exclude "ssg/*" --only-show-errors

# 2. index.html + sw.js: no-cache, so users never load a stale shell.
aws s3 cp "$DIST/index.html" "$BUCKET/index.html" --metadata-directive REPLACE \
  --cache-control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
if [ -f "$DIST/sw.js" ]; then
  aws s3 cp "$DIST/sw.js" "$BUCKET/sw.js" --metadata-directive REPLACE \
    --cache-control "no-store, no-cache, must-revalidate, max-age=0"
fi

# 3. Crawler files change every build: 1-hour cache.
for f in robots.txt sitemap.xml llms.txt; do
  if [ -f "$DIST/$f" ]; then
    aws s3 cp "$DIST/$f" "$BUCKET/$f" --metadata-directive REPLACE \
      --cache-control "public, max-age=3600"
  fi
done

# 4. Pages rendered at build time (client/scripts/ssg.mjs): ssg/<path>/index.html,
#    served by the Worker for <path>. Kept in EXACT sync with this build (each
#    page references this build's hashed JS, and the previous build's JS was
#    just deleted). If this build rendered nothing (API down, or a rollback to
#    a release from before SSG) the folder is empty and every old page is
#    removed, so the Worker falls back to the SPA shell as before.
mkdir -p "$PR/ssg"
aws s3 sync "$PR/ssg/" "$BUCKET/ssg/" --delete \
  --content-type "text/html; charset=utf-8" --cache-control "no-cache, max-age=0" --only-show-errors

# 5. Older prerendered product pages — extensionless keys served for
#    /product/<id> and /product/<id>/<sku>. Kept in EXACT sync with this build
#    (each page references this build's hashed JS, and the previous build's JS
#    was just deleted). Deleted products are removed; if prerender produced
#    nothing (feed down, or any SSG build — those no longer write base/variant)
#    all pages are removed. Pass 1 = product/<id> only, pass 2 = product/<id>/<sku> only.
mkdir -p "$PR/base/product" "$PR/variant/product"
aws s3 sync "$PR/base/product/" "$BUCKET/product/" --delete --exclude "*/*" \
  --content-type "text/html; charset=utf-8" --cache-control "no-cache, max-age=0" --only-show-errors
aws s3 sync "$PR/variant/product/" "$BUCKET/product/" --delete --exclude "*" --include "*/*" \
  --content-type "text/html; charset=utf-8" --cache-control "no-cache, max-age=0" --only-show-errors

echo "Client uploaded to $BUCKET"
