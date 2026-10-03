import { createSlice } from '@reduxjs/toolkit';

// On the SSR server there is no localStorage: every page is rendered as a
// guest, and SessionManager restores the session in the browser after mount.
const hasStorage = typeof window !== 'undefined' && !!window.localStorage;

const getInitialToken = () => {
  // Token from localStorage (set from API response body)
  // httpOnly cookies are sent automatically by browser, we can't read them
  const token = hasStorage ? localStorage.getItem('authToken') : null;
  return token || null;
};

const initialState = {
  user: hasStorage ? JSON.parse(localStorage.getItem('user') || 'null') : null,
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
      localStorage.setItem('user', JSON.stringify(user));
      if (token) {
        localStorage.setItem('authToken', token);
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
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