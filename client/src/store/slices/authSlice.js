import { createSlice } from '@reduxjs/toolkit';

const getInitialToken = () => {
  // Token from localStorage (set from API response body)
  // httpOnly cookies are sent automatically by browser, we can't read them
  const token = localStorage.getItem('authToken');
  return token || null;
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