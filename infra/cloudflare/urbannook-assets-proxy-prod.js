// Cloudflare Worker: urbannook-assets-proxy-prod
// Serves images/uploads (assets-prod.urbannook.in) from a PRIVATE S3 bucket
// (Block Public Access stays ON). The Worker signs each GET itself with SigV4
// using the automation user's keys, so only this Worker can read the bucket.
//
// Worker variables (Settings -> Variables, secrets encrypted):
//   AWS_ACCESS_KEY_ID     - Urbannook-Automation-User access key
//   AWS_SECRET_ACCESS_KEY - Urbannook-Automation-User secret
//   AWS_REGION            - ap-south-1
//   S3_BUCKET             - urbannook-assets-storage
//
// Request path maps 1:1 to the S3 key, e.g.
//   GET /prod/reviews/<productId>/<file>.jpg -> S3 key "prod/reviews/<productId>/<file>.jpg"
//
// CACHE POLICY: successful images are cached 1 day (browser + Cloudflare
// edge). Errors (404/403/5xx) are NOT cached, so an image uploaded right
// after someone hit its URL shows up immediately instead of a day later.
//
// Source of truth for this code: infra/cloudflare/ in the storefront repo.

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

// AWS's "UriEncode" (RFC 3986 unreserved chars only), applied per path segment
// so literal "/" separators are preserved and not re-encoded.
function encodeS3Path(pathname) {
  return pathname
    .split("/")
    .map((segment) =>
      encodeURIComponent(segment).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase())
    )
    .join("/");
}

async function signedS3Get(env, pathname) {
  const region = env.AWS_REGION;
  const bucket = env.S3_BUCKET;
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const canonicalUri = encodeS3Path(pathname);

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8); // YYYYMMDD

  const payloadHash = await sha256Hex(""); // GET has no body
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    "GET",
    canonicalUri,
    "", // no query string
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

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
    headers: {
      "x-amz-date": amzDate,
      "x-amz-content-sha256": payloadHash,
      Authorization: authorization,
    },
    // Cache only successful responses at the edge; errors for a few seconds max.
    cf: { cacheEverything: true, cacheTtlByStatus: { "200-299": 86400, "404": 10, "403": 10, "500-599": 0 } },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "") {
      return new Response("Not Found", { status: 404 });
    }

    const s3Response = await signedS3Get(env, url.pathname);

    const headers = new Headers(s3Response.headers);
    headers.set("Cache-Control", s3Response.ok ? "public, max-age=86400" : "no-store");
    headers.delete("set-cookie");

    return new Response(s3Response.body, {
      status: s3Response.status,
      headers,
    });
  },
};
