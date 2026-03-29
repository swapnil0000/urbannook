import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isLoading: false,
  showCartModal: false,
  showAuthModal: false,
  showLoginModal: false,
  loginCallback: null, // action to run after successful login
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
    toggleAuthModal: (state) => {
      state.showAuthModal = !state.showAuthModal;
    },
    setShowLoginModal: (state, action) => {
      state.showLoginModal = action.payload;
      if (!action.payload) state.loginCallback = null;
    },
    setLoginCallback: (state, action) => {
      // Store a string key — functions can't go in Redux state
      state.loginCallback = action.payload;
    },
    clearLoginCallback: (state) => {
      state.loginCallback = null;
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
  toggleAuthModal, 
  setShowLoginModal,
  setLoginCallback,
  clearLoginCallback,
  setNotification, 
  clearNotification 
} = uiSlice.actions;
export default uiSlice.reducer;