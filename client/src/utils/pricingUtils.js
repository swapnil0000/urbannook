/**
 * Pricing Utility Functions for Urban Nook
 * Handles GST calculations and price breakdowns
 */

const GST_RATE = 0.18; // 18% GST
const SHIPPING_CHARGE = 50; // Fixed shipping charge in rupees

/**
 * Calculate price breakdown with GST
 * @param {number} sellingPrice - Base selling price
 * @returns {object} Price breakdown with sellingPrice, gst, listedPrice
 */
export function calculatePriceBreakdown(sellingPrice) {
  const price = parseFloat(sellingPrice) || 0;
  const gst = parseFloat((price * GST_RATE).toFixed(2));
  const listedPrice = parseFloat((price + gst).toFixed(2));
  
  return {
    sellingPrice: price,
    gst,
    listedPrice
  };
}

/**
 * Ensure product has listedPrice, calculate if missing
 * @param {object} product - Product object
 * @returns {object} Product with guaranteed listedPrice
 */
export function ensureListedPrice(product) {
  if (!product) return null;
  
  if (!product.listedPrice && product.sellingPrice) {
    const breakdown = calculatePriceBreakdown(product.sellingPrice);
    return {
      ...product,
      listedPrice: breakdown.listedPrice
    };
  }
  
  return product;
}

/**
 * Calculate cart totals with GST and shipping
 * @param {array} cartItems - Array of cart items
 * @returns {object} Cart totals breakdown
 */
export function calculateCartTotals(cartItems) {
  if (!cartItems || cartItems.length === 0) {
    return {
      subtotal: 0,
      gst: 0,
      shipping: 0,
      total: 0
    };
  }

  // Calculate subtotal (sum of selling prices)
  const subtotal = cartItems.reduce((sum, item) => {
    const price = parseFloat(item.price || item.sellingPrice || 0);
    const quantity = parseInt(item.quantity || 1);
    return sum + (price * quantity);
  }, 0);

  // Calculate GST
  const gst = parseFloat((subtotal * GST_RATE).toFixed(2));
  
  // Add shipping
  const shipping = SHIPPING_CHARGE;
  
  // Calculate total
  const total = parseFloat((subtotal + gst + shipping).toFixed(2));

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    gst,
    shipping,
    total
  };
}

/**
 * Format price for display
 * @param {number} price - Price to format
 * @returns {string} Formatted price with ₹ symbol
 */
export function formatPrice(price) {
  return `₹${parseFloat(price || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/**
 * Get shipping charge
 * @returns {number} Shipping charge
 */
export function getShippingCharge() {
  return SHIPPING_CHARGE;
}

export default {
  calculatePriceBreakdown,
  ensureListedPrice,
  calculateCartTotals,
  formatPrice,
  getShippingCharge,
  GST_RATE,
  SHIPPING_CHARGE
};
