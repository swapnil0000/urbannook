import { apiSlice } from './apiSlice';

export const statsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPublicStats: builder.query({
      query: () => 'stats/public',
      keepUnusedDataFor: 600, // Cache for 10 minutes
    }),
  }),
});

export const { useGetPublicStatsQuery } = statsApi;
