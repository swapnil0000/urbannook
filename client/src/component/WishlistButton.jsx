import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAddToWishlistMutation, useRemoveFromWishlistMutation, useGetWishlistQuery } from '../store/api/userApi';
import { setWishlistItems } from '../store/slices/wishlistSlice';
import { setNotification } from '../store/slices/uiSlice';
import { useUI } from '../hooks/useRedux';

const WishlistButton = ({ productId, className = "", size = "md" }) => {
  const dispatch = useDispatch();
  const { openLoginModal } = useUI();
  const [addToWishlist] = useAddToWishlistMutation();
  const [removeFromWishlist] = useRemoveFromWishlistMutation();
  const { data: wishlistData } = useGetWishlistQuery(undefined, { 
    skip: !useSelector((state) => state.auth.isAuthenticated) 
  });
  const wishlistItems = useSelector((state) => state.wishlist.items);
  const { isAuthenticated } = useSelector((state) => state.auth);
  
  // Sync wishlist from API to Redux on mount/update
  useEffect(() => {
    if (wishlistData?.data) {
      console.log('Syncing wishlist to Redux:', wishlistData.data);
      dispatch(setWishlistItems(wishlistData.data));
    }
  }, [wishlistData, dispatch]);


  const isInWishlist = wishlistItems.some(item => 
    item.productId === productId
  );

  const handleWishlistToggle = async (e) => {
    e.stopPropagation();

    
    // Check authentication
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };
    
    const token = getCookie('userAccessToken');
    const hasLocalUser = localStorage.getItem('user');
    
    if (!isAuthenticated && !token && !hasLocalUser) {
      openLoginModal();
      return;
    }

    try {
      if (isInWishlist) {
        const response = await removeFromWishlist(productId).unwrap();
        dispatch(setNotification({
          message: response?.message || 'Removed from wishlist',
          type: 'success'
        }));
      } else {
        const response = await addToWishlist({ productId }).unwrap();
        dispatch(setNotification({
          message: response?.message || 'Added to wishlist',
          type: 'success'
        }));
      }
    } catch (error) {
      console.error('Failed to toggle wishlist:', error);
      dispatch(setNotification({
        message: error?.data?.message || 'Failed to update wishlist',
        type: 'error'
      }));
    }
  };

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-9 h-9 text-xs", 
    lg: "w-10 h-10 text-sm"
  };

  return (
    <button 
      onClick={handleWishlistToggle}
      className={`${sizeClasses[size]} backdrop-blur-md rounded-full flex items-center justify-center shadow-xl transition-colors ${
        isInWishlist ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-700 hover:bg-red-500 hover:text-white'
      } ${className}`}
    >
      <i className="fa-solid fa-heart"></i>
    </button>
  );
};

export default WishlistButton;