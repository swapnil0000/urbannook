import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isLoading: false,
  showCartModal: false,
  showAuthModal: false,
  showLoginModal: false,
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
  setNotification, 
  clearNotification 
} = uiSlice.actions;
export default uiSlice.reducer;