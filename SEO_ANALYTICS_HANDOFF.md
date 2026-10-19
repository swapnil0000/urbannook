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

## E. Requests from the storefront team (2026-10-02, PR "seo: quick wins")

1. **Remove `/cancellation-refund` from `STATIC_PAGES`** (`client/scripts/prerender.mjs:33`) and from
   `llms.txt` (around line 208). The route was removed on purpose in commit `95a7c20` ("remove
   cancellation policy"), so the sitemap lists a URL that renders the noindex 404 page.
2. **FYI, runtime head changes in this PR:**
   - The App-level `<SEOHead>` is gone. It gave every page without its own SEOHead a
     canonical pointing at the homepage.
   - `SEOHead` now leaves out the canonical and `og:url` when no `url` is passed.
   - Organization schema lives only in `index.html` (`contactPoint` was moved there).
   - The product page now outputs `og:type=product`, a BreadcrumbList, and an
     AggregateRating built only from real reviews. The placeholder "4.8" rating is removed.
   - WebSite SearchAction is removed from the home page, because `/products` doesn't
     support `?q=`.
   - Prerendered pages should still match: please check that the Product/Breadcrumb JSON-LD
     from `prerender.mjs` stays consistent with these.

## F. Category pages (2026-10-02, PR "seo: category pages")

New routes: `/category/:slug` (e.g. `/category/anime`, `/category/lamp`, `/category/pen-stand`).
Data comes from the new public API `GET /api/v1/categories` and `GET /api/v1/category/:slug`.
Categories with fewer than 3 sellable variants get `noindex`; today that is only `/category/decor`.

Requests for `prerender.mjs` / `upload-client.sh`:
1. **Sitemap:** add every category with `indexable: true` from `GET /api/v1/categories`
   (URL `/category/<slug>`, priority ~0.8), and leave out the ones that are not indexable.
2. **Prerender** `/category/<slug>`: H1 = name, intro text, FAQ, links to each variant page,
   plus CollectionPage/ItemList, BreadcrumbList and FAQPage JSON-LD (the same schema the
   runtime page outputs in `client/src/pages/shop/CategoryPage.jsx`). These pages are
   JavaScript-only until this is done.
3. **Product breadcrumb** JSON-LD: the second level is now the category
   (`/category/<slug>`), not `/products`. Please match it in the prerendered Breadcrumb.
4. `/products?category=X` still works with no redirect; its canonical now points to `/category/x`.

## G. Admin → SEO Pages (2026-10-02)

Admins can set SEO for **any URL** in Admin → SEO Pages: title, description, canonical, index/noindex,
OG title/description/image, intro text, FAQs, custom JSON-LD. The data is in the `seo_pages` collection.
The storefront reads it with `GET /api/v1/seo?path=<path>` (cached 10 min like products).
- The runtime `<SEOHead>` merges it over each page's own values (`client/src/utils/seoMerge.js`):
  a filled admin field wins, an empty one keeps the page value. No entry means no change.
- An admin `metaTitle` is used **verbatim** (no " | UrbanNook" suffix added).
- `<SeoPageContent>` (in `App.jsx`, above the footer) shows the intro + FAQs and outputs FAQPage JSON-LD.
- `index.html` no longer has a static `<meta name="robots" content="index, follow">`. `SEOHead` now
  outputs the only robots tag, so noindex pages don't carry two conflicting tags.

Request for prerender: when prerendering a URL, apply the same entry (title, description, canonical,
robots, OG, intro/FAQ) so crawlers without JS see it too. Until then (and until the Cloudflare
Worker phase), the overrides are only visible to Google after it runs JavaScript.

## H. Build-time rendering replaces `prerender.mjs` (2026-10-15, branch `seo/ssg-foundation`) — needs SEO owner sign-off

Under rule 9 these files are yours; this change is done in the open and needs your review on the PR.

**What changed**
- `client/scripts/prerender.mjs` is **removed**. `build:prod` now runs `vite build`, `vite build --ssr`
  and `client/scripts/ssg.mjs`, which renders **every public page with the real React app** (not
  hand-built HTML) from the live API: home, `/products`, `/category/<slug>`, `/product/<id>`,
  `/product/<id>/<sku>`, static pages, and a not-found page. Output: `dist-prerender/ssg/<path>/index.html`.
- `jenkins/scripts/upload-client.sh`: new step 4 syncs `ssg/` (`--delete`, `text/html`, `no-cache`);
  step 1 excludes `ssg/*`. The old `product/*` steps stay (now step 5) so a rollback to an older client
  release still works; on an SSG build they remove the old product pages.
- Worker: serves `ssg/<path>/index.html`, then old `product/*`, then the SPA shell for known app routes,
  otherwise the not-found page with **HTTP 404**. `/products/<id>` → **301** `/product/<id>`; old policy URLs (`/terms`, `/cancellation-refund[-policy]`,
  `/shipping-policy`) → **301** to the current pages; trailing
  slash → 301. `workers_dev = false`.
- Sitemap and `llms.txt` are written by `ssg.mjs`. The sitemap lists only pages that rendered, leaves out
  non-indexable categories, and has **no `<lastmod>`** (instead of a fake "today").

**Your open items from B / E / F / G**
| Item | Status |
|---|---|
| B1/B2 "₹Infinity", null Offer price | Gone: pages use the same JSON-LD as the runtime page (`ProductDetailPage.jsx`). |
| B3 fake `lastmod` | Removed (no lastmod). |
| B4 feed failure wipes pages | Same behaviour by design: a failed build has no pages, the old ones (pointing at deleted JS) are removed, the SPA serves. |
| B5 TSV parsing | Gone: JSON API, no feed parsing. |
| B6 hidden-text risk | Gone: the HTML is the visible page itself. |
| E: `/cancellation-refund` in sitemap / llms.txt | Removed; that URL now returns a real 404. |
| F1–F3 category pages in sitemap + prerendered, category breadcrumb | Done by rendering the real `CategoryPage` / `ProductDetailPage`. |
| G Admin → SEO Pages in prerendered HTML | Done: the render prefetches `GET /seo?path=` like the browser. |

**Please check**: the rendered HTML of a product, a variant, a category and `/` in Google's Rich Results
test after the first deploy, and that analytics (`analytics.js`) still fires once per page view after
hydration.

## I. Journal / blog (2026-10-16, branch `feat/blog`)

Posts are written in Admin → Blog (TipTap editor) and stored in `blog_posts` (admin owns it; the
storefront reads published posts read-only). The HTML is sanitised on save in the admin and again by the
API (`server/src/utils/blogHtml.js`): headings, lists, quotes, links and https images only.

- API: `GET /api/v1/blog?product=&limit=` (published, newest first, no bodies) and `GET /api/v1/blog/:slug`
  (body + linked products). 10-min API cache like products.
- Pages: `/blog` (Blog + BreadcrumbList JSON-LD) and `/blog/:slug` (BlogPosting + BreadcrumbList, cover image,
  "Shop the pieces in this story" product cards). Rendered at build time by `ssg.mjs`, listed in the sitemap
  and `llms.txt` (Journal section). Footer links to `/blog` ("Journal").
- Product pages: Description shows only the product's own text (variant description first). The Admin → SEO
  Pages intro (kept to 2–3 lines) shows in a "Why fans love it" section, with "Know the story →" to the newest
  blog post linked to that product (hidden while there is none).
- Variant pages (`/product/<id>/<sku>`) get a fourth breadcrumb level (visible and in BreadcrumbList), and
  product cards link straight to `/product/<id>` instead of `/products/<id>` (which only 301s there).
- A new post goes live for crawlers with the next client build (deploy or nightly 21:30 IST).

Please check after deploy: the BlogPosting result in the Rich Results test, and that `page_view` fires on
`/blog` pages like other pages.


### Google Merchant feed attributes (2026-10-18)
`GET /api/v1/catalog/google-feed.tsv` also sends `color` (from the variant name; Rainbow → Multicolor), `material`
(the product's *Material* / *Base Material* spec) and `size` (a `104cm`-style variant tag, else the variant's
L × B × H). Empty when unknown. Merchant Center reads the feed daily.


### Blog schema (2026-10-19)
`BlogPosting.about` lists linked products as `Thing` (name + URL), not `Product`: Google flags a `Product` without
`offers`/`review`/`aggregateRating` as an invalid product snippet. Full `Product`/`Offer` schema stays on the product pages.

## I. Google Merchant feed made Ads-policy safe (2026-10-20, branch `feat/google-ads-feed-compliance`)

`GET /api/v1/catalog/google-feed.tsv` (`server/src/controller/catalog.controller.js`) now:
- **Removes car brand names** (BMW, Porsche, Ferrari, … — list `CAR_BRANDS`) from `title` and
  `description`, because they are trademarks and get Shopping ads disapproved. Titles get a
  "Car Enthusiast" prefix (e.g. "Car Enthusiast Brake Caliper Lamp"); in descriptions a list of
  names becomes "iconic cars". `id`/SKU and `link` are unchanged, so Merchant Center history is kept.
- **Leaves out swords** (katana, sword, dagger, knife — `WEAPON_RE`), which Google restricts as weapons
  even when decorative. Promote them through Meta, Instagram and SEO instead.
- The website and the Meta feed (`meta-feed.csv`) are unchanged.
