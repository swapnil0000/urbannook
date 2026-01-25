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
        url: 'user/addtocart',
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
      query: () => 'user/preview-addtocart',
      providesTags: ['User'],
    }),
    clearCart: builder.mutation({
      query: () => ({
        url: 'user/clear-cart',
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),

    // Wishlist APIs
    addToWishlist: builder.mutation({
      query: (data) => ({
        url: 'user/addtowishlist',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
    getWishlist: builder.query({
      query: () => 'user/wishlist',
      providesTags: ['User'],
    }),
    removeFromWishlist: builder.mutation({
      query: (productId) => ({
        url: `user/wishlist/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),

    // Order APIs
    getOrderHistory: builder.query({
      query: () => 'user/order-history',
      providesTags: ['Order'],
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
  useGetRazorpayKeyQuery,
  useCreateOrderMutation,
  useJoinCommunityMutation,
} = userApi;