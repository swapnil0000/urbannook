import { createSlice } from '@reduxjs/toolkit';

// --- Guest Cart localStorage helpers ---
const GUEST_CART_KEY = 'guestCart';
const GUEST_ID_KEY = 'guestId';
// Seasonal gift-wrap intent (boolean only — price is never trusted from here,
// always re-fetched live from the offers config on read and, authoritatively,
// at checkout). Separate key so it survives independently of the item list.
const GUEST_GIFT_WRAP_KEY = 'guestGiftWrap';
// Which note option(s) (birthday/rakhi/none) the guest picked, alongside the
// gift-wrap boolean above — multi-select, stored as a JSON array.
const GUEST_GIFT_NOTE_KEY = 'guestGiftWrapNote';

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
    const json = JSON.stringify(items);
    localStorage.setItem(GUEST_CART_KEY, json);
  } catch (e) {
    console.error('[saveGuestCart] Failed to save:', e);
  }
};

export const loadGuestCart = () => {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return parsed;
  } catch (e) {
    console.error('[loadGuestCart] Error parsing:', e);
    return [];
  }
};

export const clearGuestCart = () => {
  localStorage.removeItem(GUEST_CART_KEY);
  localStorage.removeItem(GUEST_GIFT_WRAP_KEY);
  localStorage.removeItem(GUEST_GIFT_NOTE_KEY);
};

const loadGuestGiftWrap = () => localStorage.getItem(GUEST_GIFT_WRAP_KEY) === 'true';
const saveGuestGiftWrap = (selected) => {
  try {
    localStorage.setItem(GUEST_GIFT_WRAP_KEY, selected ? 'true' : 'false');
  } catch (e) {
    console.error('[saveGuestGiftWrap] Failed to save:', e);
  }
};

const loadGuestGiftNote = () => {
  try {
    const raw = localStorage.getItem(GUEST_GIFT_NOTE_KEY);
    const parsed = raw ? JSON.parse(raw) : ['none'];
    return Array.isArray(parsed) && parsed.length ? parsed : ['none'];
  } catch {
    return ['none'];
  }
};
const saveGuestGiftNote = (noteOptions) => {
  try {
    localStorage.setItem(GUEST_GIFT_NOTE_KEY, JSON.stringify(noteOptions?.length ? noteOptions : ['none']));
  } catch (e) {
    console.error('[saveGuestGiftNote] Failed to save:', e);
  }
};

const isGuest = () => !localStorage.getItem('authToken');

// Load persisted guest cart on app start — only for guests, not logged-in users
const isLoggedInOnLoad = !!localStorage.getItem('authToken');
const persistedItems = isLoggedInOnLoad ? [] : loadGuestCart();
const initialState = {
  items: persistedItems,
  totalQuantity: persistedItems.reduce((t, i) => t + (i.quantity || 0), 0),
  totalAmount: persistedItems.reduce((t, i) => t + ((i.price || 0) * (i.quantity || 0)), 0),
  selections: {}, // Managed by productId: { quantity, variant }
  // Boolean only — see GUEST_GIFT_WRAP_KEY comment above for why no price lives here.
  giftWrap: isLoggedInOnLoad ? false : loadGuestGiftWrap(),
  giftWrapNoteOptions: isLoggedInOnLoad ? ['none'] : loadGuestGiftNote(),
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    updateSelection: (state, action) => {
      const { productId, quantity, variant } = action.payload;
      state.selections[productId] = {
        quantity: quantity || 1,
        variant: variant || 'N/A'
      };
    },

    addItem: (state, action) => {
      const { id, name, price, image, quantity = 1, mongoId, selectedVariant, giftWrapEligible } = action.payload;
      const effectiveVariant = selectedVariant || 'N/A';
      const itemId = mongoId || id;
      
      const existingItem = state.items.find(item => 
        (item.mongoId === itemId || item.id === itemId) && 
        (item.selectedVariant || 'N/A') === (effectiveVariant)
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        state.items.push({
          id: itemId,
          mongoId: itemId,
          name,
          price: Number(price) || 0,
          image,
          quantity,
          selectedVariant: effectiveVariant,
          giftWrapEligible: !!giftWrapEligible
        });
      }

      state.totalQuantity += quantity;
      state.totalAmount += (Number(price) || 0) * quantity;

      // Persist to localStorage for guest users so cart survives refresh
      const isGuestUser = isGuest();
      if (isGuestUser) {
        getOrCreateGuestId();
        saveGuestCart(state.items);
      }
    },

    removeItem: (state, action) => {
      const { id, selectedVariant } = action.payload;
      const effectiveVariant = selectedVariant || 'N/A';
      
      const existingItem = state.items.find(item => 
        (item.id === id || item.mongoId === id) && 
        (item.selectedVariant || 'N/A') === (effectiveVariant)
      );

      if (existingItem) {
        state.totalQuantity -= existingItem.quantity;
        state.totalAmount -= (Number(existingItem.price) || 0) * existingItem.quantity;
        state.items = state.items.filter(item => 
          !((item.id === id || item.mongoId === id) && (item.selectedVariant || 'N/A') === (effectiveVariant))
        );
      }

      // Cart emptied out via individual removals (not "Clear cart") — gift
      // wrap must not survive it either, otherwise re-adding any product
      // later silently resurrects a stale "added" state never re-confirmed.
      if (state.items.length === 0 && state.giftWrap) {
        state.giftWrap = false;
        state.giftWrapNoteOptions = ['none'];
        if (isGuest()) {
          saveGuestGiftWrap(false);
          saveGuestGiftNote(['none']);
        }
      }

      if (isGuest()) {
        saveGuestCart(state.items);
      }
    },

    updateQuantity: (state, action) => {
      const { id, quantity, selectedVariant } = action.payload;
      const effectiveVariant = selectedVariant || 'N/A';
      
      const existingItem = state.items.find(item => 
        (item.id === id || item.mongoId === id) && 
        (item.selectedVariant || 'N/A') === (effectiveVariant)
      );

      if (existingItem && quantity > 0) {
        const diff = quantity - existingItem.quantity;
        existingItem.quantity = quantity;
        state.totalQuantity += diff;
        state.totalAmount += diff * (Number(existingItem.price) || 0);
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
      state.giftWrap = false;
      state.giftWrapNoteOptions = ['none'];
    },

    // Sets the gift-wrap boolean intent + which note option(s) were picked
    // (multi-select array). Guests persist both to localStorage (same pattern
    // as guest cart items); logged-in users don't need to — their intent
    // lives server-side (Cart.giftWrap/giftWrapNoteOptions), toggled via
    // useToggleGiftWrapMutation, this reducer just mirrors it locally for
    // immediate UI feedback.
    setGiftWrap: (state, action) => {
      const { selected, noteOptions } = typeof action.payload === 'object'
        ? action.payload
        : { selected: action.payload, noteOptions: state.giftWrapNoteOptions };
      state.giftWrap = !!selected;
      state.giftWrapNoteOptions = state.giftWrap
        ? (Array.isArray(noteOptions) && noteOptions.length ? noteOptions : ['none'])
        : ['none'];
      if (isGuest()) {
        saveGuestGiftWrap(state.giftWrap);
        saveGuestGiftNote(state.giftWrapNoteOptions);
      }
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
        const getPrice = () => {
          if (typeof item.price === 'number') return item.price;
          if (item.variantDetails && item.variantDetails.length > 0) {
            const selectedVariant = item.selectedVariant || 'N/A';
            const variant = item.variantDetails.find(v => v.variantName === selectedVariant);
            return Number(variant?.variantPrice) || Number(item.variantDetails[0].variantPrice) || 0;
          }
          return Number(item.price) || 0;
        };

        return {
          id: item.productId || item._id,
          mongoId: item.productId || item._id,
          name: item.productName || item.name,
          variantTitleTemplate: item.variantTitleTemplate || '',
          price: getPrice(),
          image: item.productImage || item.image || item.productImg,
          quantity,
          selectedVariant: item.selectedVariant || 'N/A'
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
        const rawQty = item.quantity;
        if (typeof rawQty === 'number') {
          quantity = rawQty;
        } else if (rawQty !== null && typeof rawQty === 'object') {
          quantity = typeof rawQty.quantity === 'number' ? rawQty.quantity : 1;
        }

        const price = typeof item.price === 'number' ? item.price : (Number(item.price?.price) || 0);

        return {
          id: item.productId || item._id,
          mongoId: item.productId || item._id,
          name: item.name || item.productName,
          variantTitleTemplate: item.variantTitleTemplate || '',
          price,
          image: item.image || item.productImage || item.productImg,
          quantity,
          selectedVariant: item.selectedVariant || 'N/A',
          giftWrapEligible: !!item.giftWrapEligible
        };
      });

      state.totalQuantity = state.items.reduce((total, item) => total + (item.quantity || 0), 0);
      state.totalAmount = state.items.reduce((total, item) => total + ((item.price || 0) * (item.quantity || 0)), 0);

      // Logged-in gift-wrap intent lives server-side (Cart.giftWrap) — mirror
      // it into redux whenever the server cart response carries it, so the
      // widget reads one consistent `state.cart.giftWrap` regardless of
      // guest vs logged-in.
      if (cartData && typeof cartData === 'object' && cartData.giftWrap) {
        state.giftWrap = !!cartData.giftWrap.selected;
        const serverNotes = cartData.giftWrap.noteOptions;
        state.giftWrapNoteOptions = Array.isArray(serverNotes) && serverNotes.length ? serverNotes : ['none'];
      }
    },
  },
});

export const { addItem, removeItem, updateQuantity, clearCart, syncCartFromProfile, setCartItems, updateSelection, setGiftWrap } = cartSlice.actions;

export default cartSlice.reducer;
