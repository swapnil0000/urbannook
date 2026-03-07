import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useGetCartQuery } from '../store/api/userApi';
import { setCartItems, clearCart } from '../store/slices/cartSlice';

export const useCartSync = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  const hasToken = !!localStorage.getItem('authToken');
  const shouldFetchCart = isAuthenticated || hasToken;

  const { data: cartResponse, refetch } = useGetCartQuery(undefined, {
    skip: !shouldFetchCart,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: false,
    refetchOnReconnect: false
  });

  useEffect(() => {
    if (cartResponse?.data) {
      if (!cartResponse?.data?.availableItems || cartResponse?.data?.availableItems?.length === 0) {
        dispatch(clearCart());
      } else {
        dispatch(setCartItems(cartResponse.data));
      }
    }
  }, [cartResponse, dispatch]);

  return { refetch };
};

export const useCartData = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  const hasToken = !!localStorage.getItem('authToken');
  const shouldFetchCart = isAuthenticated || hasToken;

  const { data: cartResponse, refetch } = useGetCartQuery(undefined, {
    skip: !shouldFetchCart,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: false,
    refetchOnReconnect: false
  });

  useEffect(() => {
    if (cartResponse?.data) {
      if (!cartResponse?.data?.availableItems || cartResponse?.data?.availableItems?.length === 0) {
        dispatch(clearCart());
      } else {
        dispatch(setCartItems(cartResponse?.data));
      }
    }
  }, [cartResponse, dispatch]);

  return { refetch };
};
