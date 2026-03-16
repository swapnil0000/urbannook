import { createSlice } from '@reduxjs/toolkit';

// --- Guest Cart localStorage helpers ---
const GUEST_CART_KEY = 'guestCart';
const GUEST_ID_KEY = 'guestId';

export const getOrCreateGuestId = () => {
  let guestId = localStorage.getItem(GUEST_ID_KEY);
  if (!guestId) {
    guestId = 'guest_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem(GUEST_ID_KEY, guestId);
  }
  return guestId;
};

const saveGuestCart = (items) => {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('[GuestCart] Failed to save:', e);
  }
};

export const loadGuestCart = () => {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const clearGuestCart = () => {
  localStorage.removeItem(GUEST_CART_KEY);
};

const isGuest = () => !localStorage.getItem('authToken');

// Load persisted guest cart on app start — only for guests, not logged-in users
const isLoggedInOnLoad = !!localStorage.getItem('authToken');
const persistedItems = isLoggedInOnLoad ? [] : loadGuestCart();
const initialState = {
  items: persistedItems,
  totalQuantity: persistedItems.reduce((t, i) => t + (i.quantity || 0), 0),
  totalAmount: persistedItems.reduce((t, i) => t + ((i.price || 0) * (i.quantity || 0)), 0),
  selections: {}, // Managed by productId: { quantity, color }
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    updateSelection: (state, action) => {
      const { productId, quantity, color } = action.payload;
      state.selections[productId] = {
        quantity: quantity || 1,
        color: color || 'N/A'
      };
    },

    addItem: (state, action) => {
      const { id, name, price, image, quantity = 1, mongoId, selectedColor } = action.payload;
      const existingItem = state.items.find(item => item.id === id);

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        state.items.push({
          id,
          mongoId: mongoId || id,
          name,
          price,
          image,
          quantity,
          selectedColor: selectedColor || 'N/A'
        });
      }

      state.totalQuantity += quantity;
      state.totalAmount += price * quantity;

      // Persist to localStorage for guest users so cart survives refresh
      if (isGuest()) {
        getOrCreateGuestId();
        saveGuestCart(state.items);
      }
    },

    removeItem: (state, action) => {
      const id = action.payload;
      const existingItem = state.items.find(item => item.id === id);

      if (existingItem) {
        state.totalQuantity -= existingItem.quantity;
        state.totalAmount -= existingItem.price * existingItem.quantity;
        state.items = state.items.filter(item => item.id !== id);
      }

      if (isGuest()) {
        saveGuestCart(state.items);
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

      if (isGuest()) {
        saveGuestCart(state.items);
      }
    },

    clearCart: (state) => {
      state.items = [];
      state.totalQuantity = 0;
      state.totalAmount = 0;
      state.selections = {};
      // Clear guest cart from localStorage on logout or order completion
      clearGuestCart();
    },

    syncCartFromProfile: (state, action) => {
      const profileCartItems = action.payload || [];
      state.items = profileCartItems.map(item => {
        let quantity = 1;
        if (typeof item.quantity === 'number') {
          quantity = item.quantity;
        } else if (item.quantity !== null && typeof item.quantity === 'object') {
          quantity = typeof item.quantity.quantity === 'number' ? item.quantity.quantity : 1;
        }
        return {
          id: item.productId || item._id,
          mongoId: item.productId || item._id,
          name: item.productName || item.name,
          price: typeof item.price === 'number' ? item.price : (item.sellingPrice || item.productPrice || 0),
          image: item.productImage || item.image || item.productImg,
          quantity,
          selectedColor: item.selectedColor || 'N/A'
        };
      });

      state.totalQuantity = state.items.reduce((total, item) => total + item.quantity, 0);
      state.totalAmount = state.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    },

    setCartItems: (state, action) => {
      const cartData = action.payload || [];

      let cartItems = [];

      if (Array.isArray(cartData)) {
        if (cartData.length > 0 && cartData[0]?.items) {
          cartItems = cartData[0].items;
        } else {
          cartItems = cartData;
        }
      } else if (cartData && typeof cartData === 'object') {
        if (cartData.availableItems && Array.isArray(cartData.availableItems)) {
          cartItems = cartData.availableItems;
        } else if (cartData.items && Array.isArray(cartData.items)) {
          cartItems = cartData.items;
        } else if (cartData.data && Array.isArray(cartData.data)) {
          cartItems = cartData.data;
        }
      }

      if (!Array.isArray(cartItems)) {
        cartItems = [];
      }

      state.items = cartItems.map(item => {
        let quantity = 1;
        if (typeof item.quantity === 'number') {
          quantity = item.quantity;
        } else if (item.quantity !== null && typeof item.quantity === 'object') {
          quantity = typeof item.quantity.quantity === 'number' ? item.quantity.quantity : 1;
        }

        const price = typeof item.price === 'number' ? item.price : (item.price?.price ?? 0);

        return {
          id: item.productId || item._id,
          mongoId: item.productId || item._id,
          name: item.name || item.productName,
          price,
          image: item.image || item.productImage || item.productImg,
          quantity,
          selectedColor: item.selectedColor || 'N/A'
        };
      });

      state.totalQuantity = state.items.reduce((total, item) => total + (item.quantity || 0), 0);
      state.totalAmount = state.items.reduce((total, item) => total + ((item.price || 0) * (item.quantity || 0)), 0);
    },
  },
});

export const { addItem, removeItem, updateQuantity, clearCart, syncCartFromProfile, setCartItems, updateSelection } = cartSlice.actions;

// // Export the clearGuestCart helper for use in hooks
// export { clearGuestCart };

export default cartSlice.reducer;
