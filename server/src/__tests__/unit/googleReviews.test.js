import { describe, it, expect } from "@jest/globals";
import { toPublicReviews, getGoogleReviewsService, GOOGLE_REVIEW_URL } from "../../services/googleReviews.service.js";

describe("Google reviews for the homepage", () => {
  it("keeps rating, count and the review fields the site shows", () => {
    const out = toPublicReviews({
      rating: 4.8, userRatingCount: 37, googleMapsUri: "https://maps.google.com/?cid=1",
      reviews: [
        { rating: 5, text: { text: "Lamp looks amazing" }, relativePublishTimeDescription: "a week ago",
          authorAttribution: { displayName: "Riya", uri: "https://www.google.com/maps/contrib/1", photoUri: "https://lh3.googleusercontent.com/a" } },
        { rating: 4 }, // star-only review: no text to show
      ],
    });
    expect(out).toMatchObject({ configured: true, rating: 4.8, total: 37, mapsUrl: "https://maps.google.com/?cid=1", writeReviewUrl: GOOGLE_REVIEW_URL });
    expect(out.reviews).toEqual([expect.objectContaining({ author: "Riya", rating: 5, text: "Lamp looks amazing", when: "a week ago" })]);
  });

  it("without an API key says not configured and never calls Google", async () => {
    const key = process.env.GOOGLE_PLACES_API_KEY;
    delete process.env.GOOGLE_PLACES_API_KEY;
    await expect(getGoogleReviewsService()).resolves.toMatchObject({ configured: false, reviews: [] });
    if (key) process.env.GOOGLE_PLACES_API_KEY = key;
  });
});
