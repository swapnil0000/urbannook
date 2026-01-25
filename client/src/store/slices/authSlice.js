import { createSlice } from '@reduxjs/toolkit';

// Helper function to get cookie
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

const getInitialToken = () => {
  return localStorage.getItem('token') || getCookie('userAccessToken');
};

const initialState = {
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: getInitialToken(),
  isAuthenticated: !!getInitialToken(),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Clear cookie as well
      document.cookie = 'userAccessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    },
  },
  extraReducers: (builder) => {
    builder.addCase('auth/logout', (state) => {
      // This will be caught by wishlist slice to clear wishlist
    });
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;