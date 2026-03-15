import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from './api/apiSlice';
import cartSlice from './slices/cartSlice';
import authSlice from './slices/authSlice';
import uiSlice from './slices/uiSlice';
import wishlistSlice from './slices/wishlistSlice';
import { logout } from './slices/authSlice';

// Reset entire RTK Query cache on logout so stale data never leaks between sessions
const logoutCacheResetMiddleware = (storeAPI) => (next) => (action) => {
  const result = next(action);
  if (logout.match(action)) {
    storeAPI.dispatch(apiSlice.util.resetApiState());
  }
  return result;
};

export const store = configureStore({
  reducer: {
    api: apiSlice.reducer,
    cart: cartSlice,
    auth: authSlice,
    ui: uiSlice,
    wishlist: wishlistSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware, logoutCacheResetMiddleware),
});

export default store;