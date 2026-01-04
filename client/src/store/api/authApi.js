import { apiSlice } from './apiSlice';

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation({
      query: (userData) => ({
        url: 'user/register',
        method: 'POST',
        body: userData,
      }),
    }),
    login: builder.mutation({
      query: (credentials) => ({
        url: 'user/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    logout: builder.mutation({
      query: () => ({
        url: 'user/logout',
        method: 'POST',
      }),
    }),
    otpSent: builder.mutation({
      query: (data) => ({
        url: 'user/send-otp',
        method: 'POST',
        body: data,
      }),
    }),
    verifyOtp: builder.mutation({
      query: (data) => ({
        url: 'user/verify-otp',
        method: 'POST',
        body: data,
      }),
    }),
    resendOtp: builder.mutation({
      query: (data) => ({
        url: 'user/resend-otp',
        method: 'POST',
        body: data,
      }),
    }),
    getProfile: builder.query({
      query: () => 'auth/profile',
      providesTags: ['User'],
    }),
    updateProfile: builder.mutation({
      query: (userData) => ({
        url: 'auth/profile',
        method: 'PUT',
        body: userData,
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useOtpSentMutation,
  useVerifyOtpMutation,
  useResendOtpMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
} = authApi;