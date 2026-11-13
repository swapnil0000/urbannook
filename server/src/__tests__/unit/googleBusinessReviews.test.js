import { toPublicGoogleReview, summarizeRatings } from "../../utils/siteStats.util.js";

describe("toPublicGoogleReview", () => {
  it("keeps only public fields", () => {
    const out = toPublicGoogleReview({ googleReviewId: "g1", reviewerName: " Asha K ", reviewerPhotoUrl: "p.jpg", rating: 5, text: " Love it ", reply: "", createTime: new Date("2026-01-02"), status: "added", productId: "X" });
    expect(out).toEqual({ id: "g1", userName: "Asha K", avatar: "p.jpg", rating: 5, text: "Love it", reply: "", createdAt: new Date("2026-01-02"), ownPhotos: [], photos: [] });
  });
  it("hides name and avatar of anonymous reviewers", () => {
    const out = toPublicGoogleReview({ googleReviewId: "g2", reviewerName: "Secret", reviewerPhotoUrl: "p.jpg", isAnonymous: true, rating: 4, text: "ok" });
    expect(out.userName).toBe("A Google user");
    expect(out.avatar).toBe("");
  });
});

describe("review photos", () => {
  it("lists photo indexes only, skipping videos and non-Google hosts", () => {
    const media = [
      { url: "https://lh3.googleusercontent.com/a=s300" },
      { url: "https://lh3.googleusercontent.com/v", isVideo: true },
      { url: "https://evil.example.com/x.png" },
      { thumbnailUrl: "https://lh5.ggpht.com/b=w100" },
    ];
    expect(toPublicGoogleReview({ googleReviewId: "g3", rating: 5, media }).photos).toEqual([0, 3]);
  });
  it("never exposes the raw Google links", () => {
    const out = toPublicGoogleReview({ googleReviewId: "g4", rating: 5, media: [{ url: "https://lh3.googleusercontent.com/a" }] });
    expect(JSON.stringify(out)).not.toContain("googleusercontent");
  });
});

describe("summarizeRatings", () => {
  it("averages only rated reviews", () => {
    expect(summarizeRatings([5, 4, 0, 5])).toEqual({ count: 3, average: 4.7 });
  });
  it("is zero with no reviews", () => {
    expect(summarizeRatings([])).toEqual({ count: 0, average: 0 });
  });
});

describe("hand-attached photos", () => {
  it("keeps only https links from the google-reviews/ folder", () => {
    const ownPhotos = ["https://cdn.example.com/prod/google-reviews/a.webp", "http://cdn.example.com/google-reviews/b.webp", "https://evil.com/x.png", "javascript:alert(1)", 5];
    expect(toPublicGoogleReview({ googleReviewId: "g5", rating: 5, ownPhotos }).ownPhotos).toEqual(["https://cdn.example.com/prod/google-reviews/a.webp"]);
  });
});
