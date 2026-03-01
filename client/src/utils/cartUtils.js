/**
 * Cart utility functions for handling cart operations and synchronization
 */

/**
 * Clear cart both in Redux store and backend
 * @param {Function} dispatch - Redux dispatch function
 * @param {Function} clearCart - Redux clearCart action
 * @param {string} apiBaseUrl - API base URL
 */
export const clearCartCompletely = async (dispatch, clearCart, apiBaseUrl) => {
  try {
    // Clear Redux store immediately
    dispatch(clearCart());
    
    // Clear backend cart
    await fetch(`${apiBaseUrl}/user/cart/clear`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    console.log('Cart cleared successfully on both frontend and backend');
  } catch (error) {
    console.error('Failed to clear backend cart:', error);
    // Still keep frontend cart cleared even if backend fails
  }
};

/**
 * Refresh cart data from backend and sync with Redux store
 * @param {Function} refetchCart - Cart refetch function from RTK Query
 */
export const refreshCartData = async (refetchCart) => {
  try {
    await refetchCart();
    console.log('Cart data refreshed successfully');
  } catch (error) {
    console.error('Failed to refresh cart data:', error);
  }
};

/**
 * Check if user is authenticated
 * @returns {boolean} - Authentication status
 */
export const isUserAuthenticated = () => {
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  const token = getCookie('userAccessToken');
  const hasLocalUser = localStorage.getItem('user');
  
  return !!(token || hasLocalUser);
};