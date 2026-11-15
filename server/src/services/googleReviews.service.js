import axios from "axios";
import env from "../config/envConfigSetup.js";

/**
 * Google reviews of the Urban Nook business profile, for the homepage review wall.
 *
 * Source: Google Places API (New) → Place Details. Google returns the overall rating,
 * the total review count and at most 5 reviews it picks as "most relevant" — the
 * API cannot list every review (that needs the Business Profile API).
 *
 * Needs GOOGLE_PLACES_API_KEY (Infisical /user/server, staging + prod). Without it the
 * endpoint answers { configured: false } and the website keeps its own testimonials.
 *
 * Cached in memory for 6 h (one Google call per 6 h per server); if Google fails we keep
 * serving the last good answer and try again after 15 min.
 */

// Urban Nook on Google Maps — the review link https://g.page/r/CRNpxJ85j9hXEAI/review opens this place.
const DEFAULT_PLACE_ID = "ChIJe337mEUjDTkRE2nEnzmP2Fc";
export const GOOGLE_REVIEW_URL = "https://g.page/r/CRNpxJ85j9hXEAI/review";

const TTL_MS = 6 * 60 * 60 * 1000;
const RETRY_MS = 15 * 60 * 1000;
let cached = null; // { data, expiresAt }
let inFlight = null;

export const toPublicReviews = (place = {}) => ({
  configured: true,
  rating: Number(place.rating) || null,
  total: Number(place.userRatingCount) || 0,
  mapsUrl: place.googleMapsUri || null,
  writeReviewUrl: GOOGLE_REVIEW_URL,
  reviews: (place.reviews || [])
    .filter((r) => r?.text?.text)
    .map((r) => ({
      author: r.authorAttribution?.displayName || "Google user",
      authorUrl: r.authorAttribution?.uri || null,
      authorPhoto: r.authorAttribution?.photoUri || null,
      rating: Number(r.rating) || 0,
      text: r.text.text,
      when: r.relativePublishTimeDescription || "",
      publishedAt: r.publishTime || null,
      url: r.googleMapsUri || null,
    })),
});

const fetchFromGoogle = async () => {
  const placeId = env.GOOGLE_PLACE_ID || DEFAULT_PLACE_ID;
  const res = await axios.get(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    params: { languageCode: "en" },
    headers: {
      "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": "rating,userRatingCount,reviews,googleMapsUri",
    },
    timeout: 8000,
  });
  return toPublicReviews(res.data);
};

export const getGoogleReviewsService = async () => {
  if (!env.GOOGLE_PLACES_API_KEY) return { configured: false, writeReviewUrl: GOOGLE_REVIEW_URL, reviews: [] };
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  inFlight ||= fetchFromGoogle()
    .then((data) => {
      cached = { data, expiresAt: Date.now() + TTL_MS };
      return data;
    })
    .catch((err) => {
      console.error("[googleReviews] Places API failed:", err.response?.status, err.response?.data?.error?.message || err.message);
      if (cached) {
        cached.expiresAt = Date.now() + RETRY_MS;
        return cached.data;
      }
      return { configured: true, unavailable: true, writeReviewUrl: GOOGLE_REVIEW_URL, reviews: [] };
    })
    .finally(() => { inFlight = null; });
  return inFlight;
};
