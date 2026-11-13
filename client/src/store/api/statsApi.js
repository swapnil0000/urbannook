import { apiSlice } from './apiSlice';

export const statsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPublicStats: builder.query({
      query: () => 'stats/public',
      keepUnusedDataFor: 600, // Cache for 10 minutes
    }),
    // The Google reviews behind the homepage "Verified Google reviews" figure (fetched only when the modal opens)
    getGoogleReviews: builder.query({
      query: () => 'stats/google-reviews',
      keepUnusedDataFor: 600,
    }),
    // The real Google Business Profile reviews for the homepage "Loved by our customers" (rating + count + cards)
    getGoogleBusinessReviews: builder.query({
      query: () => 'stats/google-business-reviews',
      keepUnusedDataFor: 600,
    }),
    // Every approved review that has a photo, for the homepage "Straight from your desks" wall
    getPhotoReviews: builder.query({
      query: () => 'stats/photo-reviews',
      keepUnusedDataFor: 600,
    }),
  }),
});

export const { useGetPublicStatsQuery, useGetGoogleReviewsQuery, useGetGoogleBusinessReviewsQuery, useGetPhotoReviewsQuery } = statsApi;
