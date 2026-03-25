import { apiSlice, fetchCsrfToken, clearCsrfToken } from './apiSlice';
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
        body: credentials, // { email } only — OTP sent to email
      }),
      // No onQueryStarted here — step 1 just sends OTP, no token yet
    }),
    loginVerifyOtp: builder.mutation({
      query: (data) => ({
        url: 'user/login/verify-otp',
        method: 'POST',
        body: data, // { email, otp }
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data.success && data.data) {
            const token = data.data.userAccessToken;
            dispatch(setCredentials({
              user: {
                email: data.data.email,
                name: data.data.name,
                role: data.data.role,
                userMobileNumber: data.data.userMobileNumber,
              },
              token,
            }));
            await fetchCsrfToken();
          }
        } catch (error) {
          console.error('Login OTP verification failed:', error);
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
          clearCsrfToken();
          
          // Wait for the API call to complete (optional)
          await queryFulfilled;
          
          // Redirect to home page
          window.location.href = '/';
        } catch (error) {
          // Even if API call fails, still logout locally
          dispatch(logoutAction());
          clearCsrfToken();
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
          if (data.success && data.data) {
            const token = data?.data?.userAccessToken;
            dispatch(setCredentials({
              user: {
                email: data?.data?.user?.email || data?.data?.email,
                name: data?.data?.user?.name,
                userId: data?.data?.user?.id,
                role: data?.data?.user?.role,
              },
              token,
            }));
            
            // Clear pending verification data
            sessionStorage.removeItem('pendingVerification');
            
            // Fetch CSRF token after successful verification
            await fetchCsrfToken();
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
    googleLogin: builder.mutation({
      query: (credentials) => ({
        url: '/user/google-login',
        method: 'POST',
        body: credentials,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data.success && data.data) {
            const token = data.data.userAccessToken;
            dispatch(setCredentials({
              user: {
                email: data.data.email,
                name: data.data.name,
                role: data.data.role,
                userId: data.data.userId,
              },
              token,
            }));
            
            // Fetch CSRF token after successful Google login
            await fetchCsrfToken();
          }
        } catch (error) {
          console.error('Google login failed:', error);
        }
      },
    }),
  }),
});

export const {
  useLoginMutation,
  useLoginVerifyOtpMutation,
  useRegisterMutation,
  useLogoutMutation,
  useOtpSentMutation,
  useVerifyOtpMutation,
  useResendOtpMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useForgotPasswordRequestMutation,
  useForgotPasswordResetMutation,
  useGoogleLoginMutation,
} = authApi;