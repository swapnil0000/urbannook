import { apiSlice } from './apiSlice';
import { setCredentials, logout as logoutAction } from '../slices/authSlice';

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation({
      query: (userData) => ({
        url: 'user/register',
        method: 'POST',
        body: userData,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // Registration now requires OTP verification - no token returned
          // The response will have requiresVerification: true
          // No need to store anything in sessionStorage
          // User will verify OTP and then get authenticated
        } catch (error) {
          console.error('Registration failed:', error);
        }
      },
    }),
    login: builder.mutation({
      query: (credentials) => ({
        url: 'user/login',
        method: 'POST',
        body: credentials,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // Set credentials in Redux and localStorage
          if (data.success && data.data) {
            dispatch(setCredentials({
              user: {
                email: data.data.email,
                name: data.data.name,
                role: data.data.role,
                userMobileNumber: data.data.userMobileNumber,
              },
              token: data.data.userAccessToken,
            }));
          }
        } catch (error) {
          console.error('Login failed:', error);
        }
      },
    }),
    logout: builder.mutation({
      query: () => ({
        url: 'user/logout',
        method: 'POST',
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          // Clear Redux state, localStorage, and cookies
          dispatch(logoutAction());
          
          // Wait for the API call to complete (optional)
          await queryFulfilled;
          
          // Redirect to home page
          window.location.href = '/';
        } catch (error) {
          // Even if API call fails, still logout locally
          dispatch(logoutAction());
          window.location.href = '/';
        }
      },
    }),
    forgotPasswordRequest: builder.mutation({
      query: (data) => ({
        url: 'user/forgot-password/request',
        method: 'POST',
        body: data,
      }),
    }),
    forgotPasswordReset: builder.mutation({
      query: (data) => ({
        url: 'user/forgot-password/reset',
        method: 'POST',
        body: data,
      }),
    }),
    otpSent: builder.mutation({
      query: (data) => ({
        url: '/send-otp',
        method: 'POST',
        body: data,
      }),
    }),
    verifyOtp: builder.mutation({
      query: (data) => ({
        url: '/verify-otp',
        method: 'POST',
        body: data,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // After successful OTP verification, authenticate the user
          if (data.success && data.data) {
            dispatch(setCredentials({
              user: {
                email: data?.data?.user?.email || data?.data?.email,
                name: data?.data?.user?.name,
                userId: data?.data?.user?.id,
                role: data?.data?.user?.role,
              },
              token: data?.data?.userAccessToken,
            }));
            // Clear pending verification data
            sessionStorage.removeItem('pendingVerification');
          }
        } catch (error) {
          console.error('OTP verification failed:', error);
        }
      },
    }),
    resendOtp: builder.mutation({
      query: (data) => ({
        url: '/send-otp',
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
  useForgotPasswordRequestMutation,
  useForgotPasswordResetMutation,
} = authApi;