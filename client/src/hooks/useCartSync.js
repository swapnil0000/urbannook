import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useGetCartQuery } from '../store/api/userApi';
import { useAddToCartMutation, useUpdateCartMutation } from '../store/api/userApi';
import { setCartItems, clearCart, clearGuestCart, loadGuestCart } from '../store/slices/cartSlice';

export const useCartSync = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  const hasToken = !!localStorage.getItem('authToken');
  const shouldFetchCart = isAuthenticated || hasToken;

  const prevAuthRef = useRef(false);
  const hasMergedRef = useRef(false);

  const [addToCartAPI] = useAddToCartMutation();
  const [updateCart] = useUpdateCartMutation();

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
    }
  }, [shouldFetchCart, refetch]);

  useEffect(() => {
    if (!cartResponse?.data) return;

    const backendItems = cartResponse.data?.availableItems || [];

    if (!hasMergedRef.current && shouldFetchCart) {
      hasMergedRef.current = true;

      // Read guest items directly from localStorage — Redux cart may already be cleared
      const guestItems = loadGuestCart();

      if (guestItems.length > 0) {
        const syncLocal = async () => {
          for (const localItem of guestItems) {
            const productId = localItem.mongoId || localItem.id;
            const inBackend = backendItems.find(
              (b) => b.productId === localItem.id || b.productId === localItem.mongoId
            );

            try {
              if (!inBackend) {
                // Not in backend — add it (always adds with qty 1), then bump to full qty in one call
                await addToCartAPI({ productId, quantity: 1 }).unwrap();
                if (localItem.quantity > 1) {
                  await updateCart({ productId, quantity: localItem.quantity - 1, action: 'add' }).unwrap();
                }
              } else {
                // Already in backend — add guest qty on top in one call
                await updateCart({ productId, quantity: localItem.quantity, action: 'add' }).unwrap();
              }
            } catch (e) {
              // ignore
            }
          }
          clearGuestCart();
          const fresh = await refetch();
          if (fresh?.data?.data) {
            const merged = fresh.data.data?.availableItems || [];
            dispatch(merged.length === 0 ? clearCart() : setCartItems(fresh.data.data));
          }
        };
        syncLocal();
        return;
      }

      clearGuestCart();
    }

    // Normal sync
    const backendItems2 = cartResponse.data?.availableItems || [];
    if (backendItems2.length === 0) {
      dispatch(clearCart());
    } else {
      dispatch(setCartItems(cartResponse.data));
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
