import { apiSlice } from "./apiSlice";

export const themeApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // keepUnusedDataFor: 0 — an admin theme change should show on the
    // storefront's next load, not wait out a stale RTK Query cache (same
    // rationale as the free-shipping-offer endpoints).
    getThemeConfig: builder.query({
      query: () => "theme",
      keepUnusedDataFor: 0,
    }),
  }),
});

export const { useGetThemeConfigQuery } = themeApi;
