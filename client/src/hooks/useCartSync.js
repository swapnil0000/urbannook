import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useGetCartQuery, useMergeGuestCartMutation } from '../store/api/userApi';
import { setCartItems, clearCart, clearGuestCart, loadGuestCart } from '../store/slices/cartSlice';

export const useCartSync = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  const hasToken = !!localStorage.getItem('authToken');
  const shouldFetchCart = isAuthenticated || hasToken;

  const prevAuthRef = useRef(false);
  const hasMergedRef = useRef(false);
  const isMergingRef = useRef(false);

  const [mergeGuestCartAPI] = useMergeGuestCartMutation();

  const { data: cartResponse, refetch } = useGetCartQuery(undefined, {
    skip: !shouldFetchCart,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    const wasAuth = prevAuthRef.current;
    prevAuthRef.current = shouldFetchCart;

    if (!wasAuth && shouldFetchCart) {
      hasMergedRef.current = false;
      refetch();
    }

    if (wasAuth && !shouldFetchCart) {
      prevAuthRef.current = false;
      hasMergedRef.current = false;
      isMergingRef.current = false;
    }
  }, [shouldFetchCart, refetch]);

  useEffect(() => {
    if (!cartResponse || !shouldFetchCart) return;

    // If merge is in progress, skip — the merge handler will update Redux
    if (isMergingRef.current) {
      console.log('[useCartSync] Merge in progress, skipping sync');
      return;
    }

    const backendItems = cartResponse.data?.availableItems || [];

    // First time after login — attempt merge
    if (!hasMergedRef.current) {
      hasMergedRef.current = true;

      // Read guest items directly from localStorage — Redux cart may already be cleared
      const guestItems = loadGuestCart();

      if (guestItems.length > 0) {

        const doMerge = async () => {
          isMergingRef.current = true;
          try {
            const result = await mergeGuestCartAPI({ guestItems }).unwrap();
          } catch (e) {
          } finally {
            isMergingRef.current = false;
            clearGuestCart();
            const fresh = await refetch();
            const freshItems = fresh?.data?.data?.availableItems || [];
            dispatch(freshItems.length > 0 ? setCartItems(fresh.data.data) : clearCart());
          }
        };
        doMerge();
        return; // Don't run normal sync below
      }
      if (backendItems.length > 0) {
        dispatch(setCartItems(cartResponse.data));
      } else {
        dispatch(clearCart());
      }
      return;
    }

    // Normal sync after merge is done — keep Redux in sync with backend
    console.log('[useCartSync] Normal sync, backend items:', backendItems.length);
    if (backendItems.length > 0) {
      dispatch(setCartItems(cartResponse.data));
    } else {
      dispatch(clearCart());
    }
  }, [cartResponse, dispatch, mergeGuestCartAPI, refetch, shouldFetchCart]);

  return { refetch, isMergingRef };
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
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (cartResponse?.data) {
      const backendItems = cartResponse.data?.availableItems || [];
      if (backendItems.length === 0) {
        dispatch(clearCart());
      } else {
        dispatch(setCartItems(cartResponse.data));
      }
    }
  }, [cartResponse, dispatch]);

  return { refetch };
};
