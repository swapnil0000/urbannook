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
 * Check if user is authenticated
 * @returns {boolean} - Authentication status
 */
export const isUserAuthenticated = () => {
  return !!localStorage.getItem('authToken');
};