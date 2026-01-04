import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getApiUrl } from '../../config/appUrls';

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

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Product', 'User', 'Order', 'Category'],
  endpoints: (builder) => ({}),
});