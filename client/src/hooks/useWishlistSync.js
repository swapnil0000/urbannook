import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useGetWishlistQuery } from '../store/api/userApi';
import { setWishlistItems } from '../store/slices/wishlistSlice';

export const useWishlistSync = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  const hasToken = !!localStorage.getItem('authToken');
  const shouldFetchWishlist = isAuthenticated || hasToken;

  const { data: wishlistResponse } = useGetWishlistQuery(undefined, {
    skip: !shouldFetchWishlist,
    refetchOnMountOrArgChange: true
  });

  useEffect(() => {
    if (wishlistResponse?.data) {
      dispatch(setWishlistItems(wishlistResponse.data));
    }
  }, [wishlistResponse, dispatch]);
};