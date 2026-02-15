import { useSelector, useDispatch } from 'react-redux';
import { addItem, removeItem, updateQuantity, clearCart } from '../store/slices/cartSlice';
import { setCredentials, logout } from '../store/slices/authSlice';
import { toggleCartModal, toggleAuthModal, setNotification, clearNotification } from '../store/slices/uiSlice';

// Cart hooks
export const useCart = () => {
  const cart = useSelector((state) => state.cart);
  const dispatch = useDispatch();

  return {
    ...cart,
    addToCart: (product) => dispatch(addItem(product)),
    removeFromCart: (id) => dispatch(removeItem(id)),
    updateCartQuantity: (id, quantity) => dispatch(updateQuantity({ id, quantity })),
    clearCart: () => dispatch(clearCart()),
  };
};

// Auth hooks
export const useAuth = () => {
  const auth = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  return {
    ...auth,
    login: (user, token) => dispatch(setCredentials({ user, token })),
    logout: () => dispatch(logout()),
  };
};

// UI hooks
export const useUI = () => {
  const ui = useSelector((state) => state.ui);
  const dispatch = useDispatch();

  return {
    ...ui,
    toggleCart: () => dispatch(toggleCartModal()),
    toggleAuth: () => dispatch(toggleAuthModal()),
    showNotification: (message, type = 'info') => {
      dispatch(setNotification({ message, type }));
      // Auto clear after 3 seconds
      setTimeout(() => dispatch(clearNotification()), 3000);
    },
    clearNotification: () => dispatch(clearNotification()),
  };
};