import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getApiUrl } from '../../config/appUrls';
import { logout, setCredentials } from '../slices/authSlice';
import { setNotification } from '../slices/uiSlice';

const baseQuery = fetchBaseQuery({
  baseUrl: getApiUrl(),
  credentials: 'include', // Send cookies with requests
  prepareHeaders: (headers, { getState }) => {
    // Try to get token from Redux state first
    let token = getState().auth.token;
    
    // If not in Redux, try to get from cookie
    if (!token) {
      const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
      };
      token = getCookie('userAccessToken');
    }
    
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Enhanced base query with automatic token refresh
const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
  
  // Check if the error is due to expired/invalid token
  if (result.error) {
    const status = result.error.status;
    const errorMessage = result.error.data?.message || '';
    
    // Handle 401 (Unauthorized) - token might be expired
    if (status === 401) {
      console.log('Access token expired, attempting to refresh...');
      
      // Try to refresh the token
      const refreshResult = await baseQuery(
        { url: '/refresh-token', method: 'POST' },
        api,
        extraOptions
      );
      
      if (refreshResult.data?.success) {
        // Successfully refreshed the token
        const newAccessToken = refreshResult.data.data?.userAccessToken;
        
        if (newAccessToken) {
          console.log('Token refreshed successfully');
          
          // Update cookie with new token
          document.cookie = `userAccessToken=${newAccessToken}; path=/; max-age=2592000`;
          
          // Update Redux state with new token
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          api.dispatch(setCredentials({ user, token: newAccessToken }));
          
          // Retry the original request with new token
          result = await baseQuery(args, api, extraOptions);
        }
      } else {
        // Refresh token also expired or invalid - logout user
        console.log('Refresh token expired, logging out user');
        
        // Clear all session data
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        document.cookie = 'userAccessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        
        // Dispatch logout action to clear Redux state
        api.dispatch(logout());
        
        // Show user-friendly notification
        api.dispatch(setNotification({
          message: 'Your session has expired. Please log in again to continue.',
          type: 'warning'
        }));
        
        // Trigger storage event for other tabs
        window.dispatchEvent(new Event('storage'));
      }
    } else if (status === 403) {
      // 403 might indicate insufficient permissions or other auth issues
      const isAuthIssue = 
        errorMessage.toLowerCase().includes('token') ||
        errorMessage.toLowerCase().includes('unauthorized') ||
        errorMessage.toLowerCase().includes('forbidden');
      
      if (isAuthIssue) {
        // Clear session and logout
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        document.cookie = 'userAccessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        
        api.dispatch(logout());
        
        api.dispatch(setNotification({
          message: 'Authentication error. Please log in again.',
          type: 'error'
        }));
        
        window.dispatchEvent(new Event('storage'));
      }
    }
  }
  
  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Product', 'User', 'Order', 'Category', 'Testimonials', 'Cart', 'Wishlist', 'Coupon'],
  keepUnusedDataFor: 60,
  endpoints: (builder) => ({}),
});