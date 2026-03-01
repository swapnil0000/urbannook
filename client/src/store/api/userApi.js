import { apiSlice } from './apiSlice';

export const userApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Profile APIs
    getUserProfile: builder.query({
      query: () => 'user/profile',
      providesTags: ['User'],
    }),
    updateUserProfile: builder.mutation({
      query: (userData) => ({
        url: 'user/profile/update',
        method: 'PATCH',
        body: userData,
      }),
      invalidatesTags: ['User'],
    }),

    // Cart APIs
    addToCart: builder.mutation({
      query: (data) => ({
        url: 'user/cart/add',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Cart'],
    }),
    updateCart: builder.mutation({
      query: (data) => ({
        url: 'user/cart/update',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Cart'],
    }),
    removeFromCart: builder.mutation({
      query: (productId) => ({
        url: `user/cart/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
    }),
    getCart: builder.query({
      query: () => 'user/cart/get',
      providesTags: ['Cart'],
    }),
    clearCart: builder.mutation({
      query: () => ({
        url: 'user/cart/clear',
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
    }),

    // Wishlist APIs
    addToWishlist: builder.mutation({
      query: (data) => ({
        url: 'user/wishlist/add',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Wishlist', 'User'],
    }),
    getWishlist: builder.query({
      query: () => 'user/wishlist/get',
      providesTags: ['Wishlist', 'User'],
    }),
    removeFromWishlist: builder.mutation({
      query: (productId) => ({
        url: `user/wishlist/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Wishlist', 'User'],
    }),

    // Order APIs
    getOrderHistory: builder.query({
      query: () => 'user/order/history',
      providesTags: ['Order'],
    }),

    // Coupon APIs
    applyCoupon: builder.mutation({
      query: (couponCode) => ({
        url: 'coupon/apply',
        method: 'POST',
        body: { couponCodeName: couponCode },
      }),
      invalidatesTags: ['User'],
    }),
    getAvailableCoupons: builder.query({
      query: () => 'coupon/list',
      providesTags: ['Coupon'],
    }),

    // Community APIs
    joinCommunity: builder.mutation({
      query: (data) => ({
        url: 'join/community',
        method: 'POST',
        body: data,
      }),
    }),
    getRazorpayKey: builder.query({
      query: () => 'rp/get-key',
    }),
    createOrder: builder.mutation({
      query: (data) => ({
        url: 'user/create-order',
        method: 'POST',
        body: data,
      }),
    }),

    // Contact APIs
    submitContact: builder.mutation({
      query: (contactData) => ({
        url: 'contact/submit',
        method: 'POST',
        body: contactData,
      }),
    }),

    // Address APIs
    searchAddress: builder.mutation({
      query: (searchInput) => ({
        url: 'user/address/search',
        method: 'POST',
        body: { userSearchInput: searchInput },
      }),
    }),
    getAddressSuggestions: builder.mutation({
      query: ({ lat, long }) => ({
        url: 'user/address/suggestion',
        method: 'POST',
        body: { lat, long },
      }),
    }),
    createAddress: builder.mutation({
      query: (addressData) => ({
        url: 'user/address/create',
        method: 'POST',
        body: addressData,
      }),
      invalidatesTags: ['Address'],
    }),
    getSavedAddresses: builder.query({
      query: () => 'user/address/saved',
      providesTags: ['Address'],
    }),
    updateAddress: builder.mutation({
      query: (addressData) => ({
        url: 'user/address/update',
        method: 'POST',
        body: addressData,
      }),
      invalidatesTags: ['Address'],
    }),
    deleteAddress: builder.mutation({
      query: (addressId) => ({
        url: 'user/address/delete',
        method: 'POST',
        body: { addressId },
      }),
      invalidatesTags: ['Address'],
    }),
  }),
});

export const {
  useGetUserProfileQuery,
  useUpdateUserProfileMutation,
  useAddToCartMutation,
  useUpdateCartMutation,
  useRemoveFromCartMutation,
  useGetCartQuery,
  useClearCartMutation,
  useAddToWishlistMutation,
  useGetWishlistQuery,
  useRemoveFromWishlistMutation,
  useGetOrderHistoryQuery,
  useApplyCouponMutation,
  useGetAvailableCouponsQuery,
  useGetRazorpayKeyQuery,
  useCreateOrderMutation,
  useJoinCommunityMutation,
  useSubmitContactMutation,
  useSearchAddressMutation,
  useGetAddressSuggestionsMutation,
  useCreateAddressMutation,
  useGetSavedAddressesQuery,
  useUpdateAddressMutation,
  useDeleteAddressMutation,
} = userApi;