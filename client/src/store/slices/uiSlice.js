import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isLoading: false,
  showCartModal: false,
  showAuthModal: false,
  showLoginModal: false,
  loginCallback: null, // action to run after successful login
  loginPrefillEmail: null, // email to prefill in login form (guest post-payment)
  notification: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    toggleCartModal: (state) => {
      state.showCartModal = !state.showCartModal;
    },
    // Explicit open/close (as opposed to toggle) for entry points that should
    // always OPEN the drawer regardless of its current state — e.g. "Go to
    // Cart" on the PDP or a mini-cart bar tap. Using toggle there would
    // incorrectly close an already-open drawer instead.
    setShowCartModal: (state, action) => {
      state.showCartModal = action.payload;
    },
    toggleAuthModal: (state) => {
      state.showAuthModal = !state.showAuthModal;
    },
    setShowLoginModal: (state, action) => {
      state.showLoginModal = action.payload;
      if (!action.payload) {
        state.loginCallback = null;
        state.loginPrefillEmail = null;
      }
    },
    setLoginCallback: (state, action) => {
      // Store a string key — functions can't go in Redux state
      state.loginCallback = action.payload;
    },
    clearLoginCallback: (state) => {
      state.loginCallback = null;
    },
    setLoginPrefillEmail: (state, action) => {
      state.loginPrefillEmail = action.payload;
    },
    setNotification: (state, action) => {
      state.notification = action.payload;
    },
    clearNotification: (state) => {
      state.notification = null;
    },
  },
});

export const {
  setLoading,
  toggleCartModal,
  setShowCartModal,
  toggleAuthModal,
  setShowLoginModal,
  setLoginCallback,
  clearLoginCallback,
  setLoginPrefillEmail,
  setNotification,
  clearNotification
} = uiSlice.actions;
export default uiSlice.reducer;