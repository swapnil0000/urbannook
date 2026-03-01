import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useGetCartQuery } from '../store/api/userApi';
import { setCartItems, clearCart } from '../store/slices/cartSlice';

export const useCartSync = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  // Check if user is authenticated
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  const token = getCookie('userAccessToken');
  const hasLocalUser = localStorage.getItem('user');
  const shouldFetchCart = isAuthenticated || token || hasLocalUser;

  const { data: cartResponse, refetch } = useGetCartQuery(undefined, {
    skip: !shouldFetchCart,
    refetchOnMountOrArgChange: true, // Changed to true to ensure fresh data
    refetchOnFocus: false,
    refetchOnReconnect: false
  });

  useEffect(() => {
    if (cartResponse?.data) {
      // If backend returns empty cart, clear Redux store
      if (!cartResponse?.data?.availableItems || cartResponse?.data?.availableItems?.length === 0) {
        dispatch(clearCart());
      } else {
        dispatch(setCartItems(cartResponse.data));
      }
    }
  }, [cartResponse, dispatch]);

  // Return refetch function for manual cart refresh
  return { refetch };
};

export const useCartData = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  // Check if user is authenticated
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  const token = getCookie('userAccessToken');
  const hasLocalUser = localStorage.getItem('user');
  const shouldFetchCart = isAuthenticated || token || hasLocalUser;

  const { data: cartResponse, refetch } = useGetCartQuery(undefined, {
    skip: !shouldFetchCart,
    refetchOnMountOrArgChange: true, // Changed to true
    refetchOnFocus: false,
    refetchOnReconnect: false
  });

  useEffect(() => {
    if (cartResponse?.data) {
      // If backend returns empty cart, clear Redux store
      if (!cartResponse?.data?.availableItems || cartResponse?.data?.availableItems?.length === 0) {
        dispatch(clearCart());
      } else {
        dispatch(setCartItems(cartResponse?.data));
      }
    }
  }, [cartResponse, dispatch]);

  return { refetch };
};