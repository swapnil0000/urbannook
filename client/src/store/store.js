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

export const makeStore = (preloadedState) => configureStore({
  preloadedState,
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

// Browser: the single app store, started from the server's state when the
// page was server-rendered (see entry-server.jsx / main.jsx). Server: none —
// entry-server makes a fresh store per request with makeStore().
export const store = typeof window !== 'undefined'
  ? makeStore(window.__PRELOADED_STATE__)
  : undefined;

export default store;