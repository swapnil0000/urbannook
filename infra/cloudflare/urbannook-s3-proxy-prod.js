// Cloudflare Worker: urbannook-s3-proxy-prod
// Serves the storefront website (urbannook.in / www) from the PRIVATE S3
// bucket set in S3_BUCKET (urbannook-prod-frontend), signing each GET with
// SigV4. Worker variables (Settings -> Variables, secrets encrypted):
//   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET
//
// CACHE POLICY: the DEPLOY decides caching per file — it sets Cache-Control
// on every S3 object (jenkins/prod.Jenkinsfile, .github/workflows/prod-deploy.yml):
//   index.html, sw.js          -> no-cache
//   product/* (SEO prerender)  -> no-cache
//   robots/sitemap/llms        -> 1 hour
//   assets/* (hashed build)    -> uploaded without Cache-Control -> immutable here
// This worker passes that header through. Fallbacks apply only when S3 has no
// Cache-Control, and error responses are never cached.
//
// Source of truth for this code: infra/cloudflare/ in the storefront repo.
// Deploy by pasting into Cloudflare -> Workers & Pages -> this worker -> Edit code.

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let key = url.pathname.replace(/^\//, "") || "index.html";

    let res = await signedS3Get(env, key);

    // SPA fallback: no file extension + 404 -> serve index.html (client-side route)
    if (res.status === 404 && !key.includes(".")) {
      key = "index.html";
      res = await signedS3Get(env, key);
    }

    const headers = new Headers(res.headers);
    headers.delete("set-cookie");

    if (!res.ok) {
      // 404 / 403 / 5xx: never cache — e.g. a deleted old JS file must not
      // stay "missing" in the browser for a year.
      headers.set("Cache-Control", "no-store");
    } else if (key === "index.html" || key === "sw.js") {
      headers.set("Cache-Control", NO_CACHE);
    } else if (!headers.get("Cache-Control")) {
      // No Cache-Control on the S3 object: only hashed build assets are safe
      // to cache forever; anything else gets a short cache.
      headers.set("Cache-Control", key.startsWith("assets/") ? IMMUTABLE : "public, max-age=3600");
    }
    // else: keep the Cache-Control the deploy set on the S3 object.

    return new Response(res.body, { status: res.status, headers });
  },
};
