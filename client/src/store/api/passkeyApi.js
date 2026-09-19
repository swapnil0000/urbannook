import { apiSlice, fetchCsrfToken } from './apiSlice';
import { setCredentials } from '../slices/authSlice';

// WebAuthn / passkey endpoints. The two register/* calls require an authenticated
// session (bearer + cookies added by the shared baseQuery). login/verify mints the
// same session as every other login path and, like verifyOtp, authenticates the
// user in onQueryStarted (setCredentials + CSRF) so the UI just has to close.
export const passkeyApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    passkeyStatus: builder.query({
      query: () => '/user/passkey/status',
    }),
    passkeyRegisterOptions: builder.mutation({
      query: (body = {}) => ({ url: '/user/passkey/register/options', method: 'POST', body }),
    }),
    passkeyRegisterVerify: builder.mutation({
      query: (body) => ({ url: '/user/passkey/register/verify', method: 'POST', body }),
    }),
    passkeyLoginOptions: builder.mutation({
      query: (body) => ({ url: '/user/passkey/login/options', method: 'POST', body }),
    }),
    passkeyLoginVerify: builder.mutation({
      query: (body) => ({ url: '/user/passkey/login/verify', method: 'POST', body }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data.success && data.data) {
            dispatch(setCredentials({
              user: {
                email: data.data.email,
                name: data.data.name,
                userId: data.data.userId,
                role: data.data.role,
              },
              token: data.data.userAccessToken,
            }));
            await fetchCsrfToken();
          }
        } catch (error) {
          console.error('Passkey login failed:', error);
        }
      },
    }),
  }),
});

export const {
  useLazyPasskeyStatusQuery,
  usePasskeyRegisterOptionsMutation,
  usePasskeyRegisterVerifyMutation,
  usePasskeyLoginOptionsMutation,
  usePasskeyLoginVerifyMutation,
} = passkeyApi;
