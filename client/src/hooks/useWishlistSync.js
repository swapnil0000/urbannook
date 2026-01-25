import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useGetWishlistQuery } from '../store/api/userApi';
import { setWishlistItems } from '../store/slices/wishlistSlice';

export const useWishlistSync = () => {
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
  const shouldFetchWishlist = isAuthenticated || token || hasLocalUser;

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