import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  totalQuantity: 0,
  totalAmount: 0,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, action) => {
      const { id, name, price, image, quantity = 1, mongoId } = action.payload;
      const existingItem = state.items.find(item => item.id === id);
      
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        state.items.push({ 
          id, 
          mongoId: mongoId || id, // Use provided mongoId or fallback to id
          name, 
          price, 
          image, 
          quantity 
        });
      }
      
      state.totalQuantity += quantity;
      state.totalAmount += price * quantity;
    },
    removeItem: (state, action) => {
      const id = action.payload;
      const existingItem = state.items.find(item => item.id === id);
      
      if (existingItem) {
        state.totalQuantity -= existingItem.quantity;
        state.totalAmount -= existingItem.price * existingItem.quantity;
        state.items = state.items.filter(item => item.id !== id);
      }
    },
    updateQuantity: (state, action) => {
      const { id, quantity } = action.payload;
      const existingItem = state.items.find(item => item.id === id);
      
      if (existingItem && quantity > 0) {
        const diff = quantity - existingItem.quantity;
        existingItem.quantity = quantity;
        state.totalQuantity += diff;
        state.totalAmount += diff * existingItem.price;
      }
    },
    clearCart: (state) => {
      state.items = [];
      state.totalQuantity = 0;
      state.totalAmount = 0;
    },
    syncCartFromProfile: (state, action) => {
      const profileCartItems = action.payload || [];
      state.items = profileCartItems.map(item => ({
        id: item.productId || item._id,
        mongoId: item.productId || item._id, // Store MongoDB ID
        name: item.productName || item.name,
        price: item.productPrice || item.price || item.sellingPrice,
        image: item.productImage || item.image || item.productImg,
        quantity: item.quantity || 1
      }));
      
      state.totalQuantity = state.items.reduce((total, item) => total + item.quantity, 0);
      state.totalAmount = state.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    },
    setCartItems: (state, action) => {
      const cartData = action.payload || [];
      // Handle the new API response format
      const cartItems = cartData[0]?.items || cartData;
      
      state.items = cartItems.map(item => ({
        id: item.productId || item._id,
        mongoId: item.productId || item._id,
        name: item.name || item.productName,
        price: item.price || item.productPrice || item.sellingPrice,
        image: item.image || item.productImage || item.productImg,
        quantity: item.quantity || 1
      }));
      
      state.totalQuantity = state.items.reduce((total, item) => total + item.quantity, 0);
      state.totalAmount = state.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    },
  },
});

export const { addItem, removeItem, updateQuantity, clearCart, syncCartFromProfile, setCartItems } = cartSlice.actions;
export default cartSlice.reducer;