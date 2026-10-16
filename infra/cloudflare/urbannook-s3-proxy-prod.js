// Cloudflare Worker: urbannook-s3-proxy-prod
// Serves the storefront website (urbannook.in / www) from the PRIVATE S3
// bucket set in S3_BUCKET (urbannook-prod-frontend), signing each GET with
// SigV4. Worker variables (Settings -> Variables, secrets encrypted):
//   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET
//
// CACHE POLICY: the DEPLOY decides caching per file — it sets Cache-Control
// on every S3 object (jenkins/prod.Jenkinsfile, .github/workflows/prod-deploy.yml):
//   index.html, sw.js          -> no-cache
//   ssg/* (pages rendered at build), product/* (older prerender) -> no-cache
//   robots/sitemap/llms        -> 1 hour
//   assets/* (hashed build)    -> uploaded without Cache-Control -> immutable here
// This worker passes that header through. Fallbacks apply only when S3 has no
// Cache-Control, and error responses are never cached.
//
// PAGES (no file extension): ssg/<path>/index.html if the build rendered it,
// else an older product/* prerender, else the SPA shell for known app routes,
// else the rendered not-found page with HTTP 404. /products/<id> and trailing
// slashes 301 to the one canonical URL. See resolvePage().
//
// Source of truth for this code: infra/cloudflare/ in the storefront repo.
// Deployed by Jenkins (jenkins/prod.Jenkinsfile) with wrangler — never edit in the dashboard.

const encoder = new TextEncoder();

async function sha256Hex(message) {
  const data = typeof message === "string" ? encoder.encode(message) : message;
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(key, message) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    typeof key === "string" ? encoder.encode(key) : key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message)));
}

function toHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function encodeS3Path(pathname) {
  return pathname
    .split("/")
    .map((segment) =>
      encodeURIComponent(segment).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase())
    )
    .join("/");
}

async function signedS3Get(env, key) {
  const region = env.AWS_REGION;
  const bucket = env.S3_BUCKET;
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const canonicalUri = encodeS3Path(`/${key}`);

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = await sha256Hex("");
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = ["GET", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");

  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = await hmac("AWS4" + env.AWS_SECRET_ACCESS_KEY, dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, "s3");
  const kSigning = await hmac(kService, "aws4_request");
  const signature = toHex(await hmac(kSigning, stringToSign));

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${env.AWS_ACCESS_KEY_ID}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(`https://${host}${canonicalUri}`, {
    headers: { "x-amz-date": amzDate, "x-amz-content-sha256": payloadHash, Authorization: authorization },
  });
}

const NO_CACHE = "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
const IMMUTABLE = "public, max-age=31536000, immutable";

// Every route the app knows (client/src/store/AppRoutes.jsx). A page path that
// matches none of these gets the rendered not-found page with a real 404;
// one that matches but has no rendered page (a product added after the last
// build, checkout, account pages…) gets the SPA shell with 200 as before.
const APP_ROUTES = [
  /^\/$/, /^\/products$/, /^\/product\/[^/]+(\/[^/]+)?$/, /^\/category\/[^/]+$/,
  /^\/(about-us|contact-us|customer-support|customize|faqs|rewards|terms-conditions|privacy-policy|return-policy)$/,
  /^\/(checkout|profile|orders|wishlist|settings|payment-failed)$/,
  /^\/(payment-processing|order-confirm)\/[^/]+$/, /^\/nfc(\/.*)?$/,
];

const redirect = (url, pathname) => {
  const to = new URL(url);
  to.pathname = pathname;
  return new Response(null, { status: 301, headers: { Location: to.toString(), "Cache-Control": "public, max-age=3600" } });
};

/** Which S3 object answers a page (extensionless) path, and with what status. */
async function resolvePage(env, pathname) {
  // 1. Page rendered at build time (client/scripts/ssg.mjs → ssg/<path>/index.html).
  const ssgKey = pathname === "/" ? "ssg/index.html" : `ssg${pathname}/index.html`;
  let res = await signedS3Get(env, ssgKey);
  if (res.ok) return { key: ssgKey, res, status: 200 };

  // 2. Older builds' prerendered product pages (product/<id>[/<sku>]) — still
  //    present after a rollback to a client release from before SSG.
  if (pathname !== "/") {
    res = await signedS3Get(env, pathname.slice(1));
    if (res.ok) return { key: pathname.slice(1), res, status: 200 };
  }

  // 3. A real app route without a rendered page: the SPA shell renders it.
  if (APP_ROUTES.some((re) => re.test(pathname))) {
    return { key: "index.html", res: await signedS3Get(env, "index.html"), status: 200 };
  }

  // 4. Unknown path: the rendered not-found page with a real 404 (no soft 404).
  //    Builds without it (SSG skipped) fall back to the SPA shell as before.
  res = await signedS3Get(env, "ssg/__404/index.html");
  if (res.ok) return { key: "ssg/__404/index.html", res, status: 404 };
  return { key: "index.html", res: await signedS3Get(env, "index.html"), status: 200 };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const isPage = !pathname.slice(pathname.lastIndexOf("/") + 1).includes(".");

    if (isPage) {
      // One URL per page: no trailing slash, and the old /products/<id> page
      // (same product as /product/<id>) moves to /product/<id>.
      if (pathname.length > 1 && pathname.endsWith("/")) return redirect(url, pathname.replace(/\/+$/, ""));
      const legacy = pathname.match(/^\/products\/([^/]+)$/);
      if (legacy) return redirect(url, `/product/${legacy[1]}`);
    }

    let key;
    let res;
    let status;
    if (isPage) {
      ({ key, res, status } = await resolvePage(env, pathname));
    } else {
      key = pathname.replace(/^\//, "");
      res = await signedS3Get(env, key);
      status = res.status;
    }

    const headers = new Headers(res.headers);
    headers.delete("set-cookie");

    if (!res.ok || status >= 400) {
      // 404 / 403 / 5xx (incl. the not-found page): never cache — e.g. a deleted
      // old JS file must not stay "missing" in the browser for a year.
      headers.set("Cache-Control", "no-store");
    } else if (key === "index.html" || key === "sw.js" || key.startsWith("ssg/")) {
      // Pages reference this build's hashed JS: never serve a stale one.
      headers.set("Cache-Control", NO_CACHE);
    } else if (!headers.get("Cache-Control")) {
      // No Cache-Control on the S3 object: only hashed build assets are safe
      // to cache forever; anything else gets a short cache.
      headers.set("Cache-Control", key.startsWith("assets/") ? IMMUTABLE : "public, max-age=3600");
    }
    // else: keep the Cache-Control the deploy set on the S3 object.

    return new Response(res.body, { status, headers });
  },
};
