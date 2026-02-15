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
      invalidatesTags: ['User'],
    }),
    updateCart: builder.mutation({
      query: (data) => ({
        url: 'user/cart/update',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
    removeFromCart: builder.mutation({
      query: (productId) => ({
        url: `user/cart/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
    getCart: builder.query({
      query: () => 'user/cart/get',
      providesTags: ['User'],
    }),
    clearCart: builder.mutation({
      query: () => ({
        url: 'user/cart/clear',
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),

    // Wishlist APIs
    addToWishlist: builder.mutation({
      query: (data) => ({
        url: 'user/wishlist/add',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Wishlist'],
    }),
    getWishlist: builder.query({
      query: () => 'user/wishlist/get',
      providesTags: ['Wishlist'],
    }),
    removeFromWishlist: builder.mutation({
      query: (productId) => ({
        url: `user/wishlist/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Wishlist'],
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
    removeCoupon: builder.mutation({
      query: () => ({
        url: 'coupon/remove',
        method: 'DELETE',
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
  useRemoveCouponMutation,
  useGetAvailableCouponsQuery,
  useGetRazorpayKeyQuery,
  useCreateOrderMutation,
  useJoinCommunityMutation,
} = userApi;