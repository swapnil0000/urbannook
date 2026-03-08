import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getApiUrl } from '../../config/appUrls';
import { logout, setCredentials } from '../slices/authSlice';
import { setNotification } from '../slices/uiSlice';

// Store CSRF token in memory (not localStorage for security)
let csrfToken = null;

/**
 * Fetch CSRF token from backend
 * Call this after user logs in or on app load if user is authenticated
 */
export const fetchCsrfToken = async () => {
  try {
    const response = await fetch(`${getApiUrl()}/csrf-token`, {
      credentials: 'include', // Send cookies
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      csrfToken = data.csrfToken;
      return csrfToken;
    } else {
      console.warn('[CSRF] Failed to fetch token:', response.status);
      return null;
    }
  } catch (error) {
    console.error('[CSRF] Error fetching token:', error);
    return null;
  }
};

/**
 * Clear CSRF token (call on logout)
 */
export const clearCsrfToken = () => {
  csrfToken = null;
};

/**
 * Get current CSRF token
 */
export const getCsrfToken = () => csrfToken;

const baseQuery = fetchBaseQuery({
  baseUrl: getApiUrl(),
  credentials: 'include', // Send cookies with requests (httpOnly cookies go automatically)
  prepareHeaders: (headers, { getState }) => {
    // Get token from Redux state (sourced from localStorage)
    const token = getState().auth.token;
    
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    
    // Add CSRF token to headers for state-changing requests
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
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
    
    // Skip reauth logic for network errors, CORS errors, etc.
    if (status === 'FETCH_ERROR' || status === 'PARSING_ERROR' || status === 'TIMEOUT_ERROR') {
      return result;
    }
    
    // Get the endpoint URL to check if it's a login/register endpoint
    const url = typeof args === 'string' ? args : args.url;
    const isAuthEndpoint = url?.includes('/login') || 
                          url?.includes('/register') || 
                          url?.includes('/google-login') ||
                          url?.includes('/forgot-password');
    
    // Handle 401 (Unauthorized) - token might be expired
    // BUT: Don't try to refresh on auth endpoints (login, register, google-login)
    if (status === 401 && !isAuthEndpoint) {
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
          // Update Redux state and localStorage with new token
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          api.dispatch(setCredentials({ user, token: newAccessToken }));
          
          // Retry the original request with new token
          result = await baseQuery(args, api, extraOptions);
        }
      } else {
        // Refresh token also expired or invalid - logout user
        
        // Clear all session data
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
        
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
    } else if (status === 401 && isAuthEndpoint) {
      // For auth endpoints, just return the error without trying to refresh
    } else if (status === 403) {
      // 403 might indicate CSRF token issue or insufficient permissions
      const isCsrfIssue = 
        errorMessage.toLowerCase().includes('csrf');
      
      if (isCsrfIssue) {
        // Try to fetch new CSRF token and retry
        const newCsrfToken = await fetchCsrfToken();
        
        if (newCsrfToken) {
          // Retry the original request with new CSRF token
          result = await baseQuery(args, api, extraOptions);
        } else {
          api.dispatch(setNotification({
            message: 'Security token expired. Please refresh the page.',
            type: 'warning'
          }));
        }
      }
      // Don't logout on generic 403 - it could be a permissions issue, not auth
    }
  }
  
  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Product', 'User', 'Order', 'Category', 'Testimonials', 'Cart', 'Wishlist', 'Coupon', 'Address'],
  keepUnusedDataFor: 300, // Keep cached data for 5 minutes instead of 1 minute
  refetchOnMountOrArgChange: 30, // Only refetch if data is older than 30 seconds
  refetchOnFocus: false, // Don't refetch when window regains focus
  refetchOnReconnect: false, // Don't refetch when reconnecting
  endpoints: (builder) => ({}),
});