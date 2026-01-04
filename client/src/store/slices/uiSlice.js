import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isLoading: false,
  showCartModal: false,
  showAuthModal: false,
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
  setNotification, 
  clearNotification 
} = uiSlice.actions;
export default uiSlice.reducer;