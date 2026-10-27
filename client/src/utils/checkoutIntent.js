// Every "Checkout" button goes through here. PromotionUnlockSheet (mounted at
// the app root) checks the cart for an offer that is one step away or a free
// gift not yet claimed, and shows it once with "Continue to checkout";
// otherwise it goes straight to /checkout. The cart is the source of truth,
// so it doesn't matter where or when the items were added.
export const requestCheckout = (navigate) => {
  if (typeof window !== 'undefined' && window.__unOfferSheetReady) {
    window.dispatchEvent(new CustomEvent('un:checkout-intent'));
  } else {
    navigate('/checkout');
  }
};
