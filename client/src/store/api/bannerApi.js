import { apiSlice } from "./apiSlice";

export const bannerApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // keepUnusedDataFor: 0 — an admin banner change should show on next
    // load, not wait out a stale RTK Query cache.
    getActiveBanners: builder.query({
      query: () => "site-banners/active",
      keepUnusedDataFor: 0,
    }),
  }),
});

export const { useGetActiveBannersQuery } = bannerApi;
