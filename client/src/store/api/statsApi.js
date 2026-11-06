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
  }),
});

export const { useGetPublicStatsQuery, useGetGoogleReviewsQuery } = statsApi;
