# SEO / Analytics — issues found during the Jenkins migration (for the SEO owner)

**Date:** 2026-09-28. **Found while:** moving prod deploys from GitHub Actions to Jenkins.
**Nothing below was changed by the deploy work.** SEO and analytics code is yours. Each item
says whether you need to act or whether it's just for your information.

Code at: `main` @ `1eaee8f` (SEO phase 0 merged).

---

## A. Things that change for you because of the migration (FYI, please read)

1. **Prod deploy now runs on Jenkins, not GitHub Actions.**
   - Job: `UrbanNook-Prod-Deploy`.
   - File: `jenkins/prod.Jenkinsfile`.
   - `prod-deploy.yml` was moved **unchanged** to `.github/disabled/` (GitHub only
     runs files in `.github/workflows/`). Their prerender/robots/sitemap/llms S3 upload steps
     were copied into Jenkins **1:1**. See section D.
2. **The nightly SEO refresh is now at 21:30 IST, not 03:00.**
   - Jenkins runs on the staging EC2, which shuts down at 22:00, so a 03:00 run would never
     happen.
   - The prices and stock in the prerendered pages will be at most about 24 hours old, as
     before, but they are now refreshed in the evening.
   - If you need a refresh at another time, run the job manually.
3. **Build values now come from Infisical** (`prod` → `/user/client`), not GitHub Secrets.
   - The build now **fails** if a required `VITE_*` key is missing.
   - The build **warns** if `VITE_GOOGLE_ADS_ID`, `VITE_GADS_LABEL_PURCHASE` or
     `VITE_MAGIC_CHECKOUT_ENABLED` are missing. If those warnings appear, **Google Ads purchase
     conversions are OFF** in that build.
   - 👉 **Action:** confirm both Google Ads keys have their correct values in Infisical.
4. **The CloudFront invalidation in `prod-deploy.yml` never did anything useful.**
   - The site is served by the Cloudflare Worker `urbannook-s3-proxy-prod`, not CloudFront.
   - Jenkins purges the **Cloudflare** cache instead.
   - The comments in `client/scripts/prerender.mjs` and `prod-deploy.yml` that say "CloudFront
     serves /product/<id>" are out of date.
5. **Until the new worker deploys, the live worker overrides your cache headers.**
   - It forces `max-age=31536000, immutable` (1 year) on everything except `index.html` and
     `sw.js`.
   - That includes `product/*` prerender pages, `sitemap.xml`, `robots.txt` and `llms.txt`.
   - So the `no-cache` and `max-age=3600` values uploaded by the deploy are ignored today, and
     browsers and Cloudflare can hold old product pages for a long time.
   - **Fixed by the new worker** (`infra/cloudflare/urbannook-s3-proxy-prod.js`), which passes
     your S3 `Cache-Control` through. It goes live with the first Jenkins deploy.
   - 👉 **Action after that deploy:** check that `curl -sI https://www.urbannook.in/sitemap.xml`
     shows `max-age=3600`.

## B. Bugs / risks in SEO code (not fixed — yours to decide)

| # | Where | Problem | Impact |
|---|---|---|---|
| 1 | `prerender.mjs`: `Math.min(...prices)` in `renderProductHtml` and `llmsTxt` | If no variant has a price, `prices` is empty and `Math.min()` returns `Infinity`. `parseFloat('0') \|\| null` also drops a price of 0. | Title, description and llms.txt show **"from ₹Infinity"**. |
| 2 | `prerender.mjs` `productJsonLd` → `offer.price` | `price` can be `null` (same cause as #1). | That product fails Google's Product/Offer rich-result validation. |
| 3 | `prerender.mjs` `sitemap()` | Every URL's `<lastmod>` is set to *today* on every nightly build. | Google learns that lastmod is unreliable and ignores it. Better: use the product's real `updatedAt`. |
| 4 | `prerender.mjs` feed failure | If the feed fetch fails (API down or slow over 20s at build time), 0 pages are produced and the deploy's `sync --delete` **removes every prerendered product page** from S3 until the next good build. | Crawlers get the empty SPA shell again for up to a day. Consider keeping the previous pages when the feed fails. |
| 5 | `prerender.mjs` `parseTsv` | Splits naively on `\t` and `\n`, with no quoting support. | A product description containing a tab or newline shifts the columns or breaks the row. Check that the server's feed strips them. |
| 6 | Prerender body is visually hidden (`clip:rect(0 0 0 0)`) | Content that is readable by bots but hidden from users. | Low risk because the same content renders in React, but worth watching in Search Console for "hidden text" flags. |

## C. Meta / GA4 / Google Ads events

The event code (`client/src/utils/analytics.js`) was only skimmed, not reviewed. Nothing
wrong was spotted in a quick read: Meta `eventID` is passed as the 4th argument, and
dedup keys exist for ViewContent, AddToCart, InitiateCheckout and Purchase. The only
deploy-related risk is **A3** (missing Google Ads keys means conversions are off).

## D. Deploy pipeline: `prod-deploy.yml` → `jenkins/prod.Jenkinsfile`

Everything `prod-deploy.yml` did now happens in Jenkins. The SEO steps (the `build:prod`
prerender, the upload order, and the cache headers for `product/*`, robots, sitemap and llms)
are **copied as-is**. Only the deploy mechanics around them changed:

| # | Old (GitHub Actions) | Now (Jenkins) | Why |
|---|---|---|---|
| 1 | Push to main → deploy | Merge to main → GitHub webhook → deploy (main only) | Same behaviour |
| 2 | Nightly 03:00 IST, client only | Nightly **21:30 IST**, client only | Jenkins' machine is off 22:00–morning |
| 3 | Build values from GitHub Secrets | From Infisical `prod /user/client`. A missing required key fails the build; missing Google Ads or Magic Checkout keys give a warning. | One source of secrets |
| 4 | `npm install` | `npm ci` (exact lockfile) | Reproducible builds |
| 5 | CloudFront invalidation (site isn't on CloudFront) | **Cloudflare** cache purge | The old step cleared nothing |
| 6 | Live worker forced a 1-year cache on everything | Worker deployed from `infra/cloudflare/`; it respects the `Cache-Control` the deploy sets | Your `no-cache` / 1-hour headers now actually apply |
| 7 | Server: rsync over the live folder + `npm install` on prod | Server built on Jenkins into a `.tar.gz`, stored in S3, extracted to `releases/<N>` on prod, `current` symlink switched | Prod does no building; every release can be rolled back |
| 8 | No health check | `/health` check; on failure, prod switches back to the previous release automatically | Bad deploys don't stay live |
| 9 | `StrictHostKeyChecking=no`, SSH open to the internet | Host key checked; prod SSH only from the Jenkins machine's private IP | Security |
| 10 | Two deploys could overlap (concurrency group) | `disableConcurrentBuilds()` | Same protection |

**Suggested improvements for the SEO steps (not done, your call):**
- Section B #4: when the feed fails, skip the two `product/` sync steps instead of syncing an empty
  folder with `--delete`. This keeps yesterday's pages.
- Run the nightly refresh only if the feed actually changed, to save a full rebuild every night.
