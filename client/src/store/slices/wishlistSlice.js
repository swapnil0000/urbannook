import { createSlice } from '@reduxjs/toolkit';
import { logout } from './authSlice';

const initialState = {
  items: [],
  isLoaded: false
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    setWishlistItems: (state, action) => {
      state.items = action.payload;
      state.isLoaded = true;
    },
    addToWishlistLocal: (state, action) => {
      const productName = action.payload;
      const exists = state.items.some(item => item.productName === productName);
      if (!exists) {
        state.items.push({ productName });
      }
    },
    removeFromWishlistLocal: (state, action) => {
      const productName = action.payload;
      state.items = state.items.filter(item => item.productName !== productName);
    },
    clearWishlist: (state) => {
      state.items = [];
      state.isLoaded = false;
    }
  },
  extraReducers: (builder) => {
    builder.addCase(logout, (state) => {
      state.items = [];
      state.isLoaded = false;
    });
  }
});

export const { setWishlistItems, addToWishlistLocal, removeFromWishlistLocal, clearWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;