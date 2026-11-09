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

// Public figures from GET /stats/public, always rounded DOWN so a claim is
// never bigger than the truth: counts to the hundred (1006 -> "1000+") or, under
// 100, to the ten (73 -> "70+"); the rating to one decimal (4.96 -> "4.9").
// The fallbacks only show while loading / on the prerendered page - keep them
// at or below the real numbers.
const FALLBACK = { totalOrders: 1000, totalReviews: 70, avgRating: 4.9, members: 1900 };

export const roundDown = (n) => (n >= 100 ? Math.floor(n / 100) * 100 : n >= 10 ? Math.floor(n / 10) * 10 : n);

/** e.g. shownCount(stats, 'totalReviews') -> 70 */
export const shownCount = (stats, key) => roundDown(Number(stats?.[key]) || FALLBACK[key]);

/** "4.9" */
export const shownRating = (stats) => (Math.floor((Number(stats?.avgRating) || FALLBACK.avgRating) * 10) / 10).toFixed(1);

export const ordersShown = (total) => shownCount({ totalOrders: total }, 'totalOrders');
