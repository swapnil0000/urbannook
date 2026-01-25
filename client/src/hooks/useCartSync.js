import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useGetCartQuery } from '../store/api/userApi';
import { setCartItems } from '../store/slices/cartSlice';

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

  const { data: cartResponse } = useGetCartQuery(undefined, {
    skip: !shouldFetchCart,
    refetchOnMountOrArgChange: true
  });

  useEffect(() => {
    if (cartResponse?.data) {
      dispatch(setCartItems(cartResponse.data));
    }
  }, [cartResponse, dispatch]);
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
    refetchOnMountOrArgChange: true
  });

  useEffect(() => {
    if (cartResponse?.data) {
      dispatch(setCartItems(cartResponse.data));
    }
  }, [cartResponse, dispatch]);

  return { refetch };
};