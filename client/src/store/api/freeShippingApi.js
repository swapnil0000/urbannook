import { apiSlice } from './apiSlice';

// Read-only storefront endpoints for the free-shipping cross-sell offer.
// Display config lives here; actual eligibility is enforced server-side at
// order time (both source + recommended product must be in the cart).
export const freeShippingApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // { isActive, thresholdAmount }
    getFreeShippingOffer: builder.query({
      query: () => 'free-shipping-offer',
    }),
    // active banner for a product page, or null
    getFreeShippingBanner: builder.query({
      query: (productId) => `free-shipping-offer/banner/${productId}`,
    }),
    // all active banners (home / checkout)
    getAllFreeShippingBanners: builder.query({
      query: () => 'free-shipping-offer/banners',
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetFreeShippingOfferQuery,
  useGetFreeShippingBannerQuery,
  useGetAllFreeShippingBannersQuery,
} = freeShippingApi;
