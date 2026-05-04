/**
 * @module analytics
 * Centralized GA4 e-commerce event tracking via GTM dataLayer.
 * All functions are gated by config.features.enableAnalytics.
 * All functions are wrapped in try-catch to prevent UI disruption.
 */

import config from '../config/env';

/**
 * Internal helper — pushes event data to window.dataLayer
 * after verifying environment, feature flag, and dataLayer existence.
 */
function pushEvent(eventData) {
  if (typeof window === 'undefined') return;
  if (!config.features.enableAnalytics) return;
  if (!window.dataLayer) return;
  window.dataLayer.push(eventData);
}

export function trackViewItem({ itemId, itemName, itemVariant, price, quantity = 1 }) {
  try {
    pushEvent({
      event: 'view_item',
      ecommerce: {
        currency: 'INR',
        value: price,
        items: [{ item_id: itemId, item_name: itemName, item_variant: itemVariant, price, quantity }],
      },
    });
  } catch (error) {
    console.warn('[Analytics]', 'trackViewItem:', error);
  }
}

export function trackAddToCart({ itemId, itemName, itemVariant, price, quantity = 1 }) {
  try {
    pushEvent({
      event: 'add_to_cart',
      ecommerce: {
        currency: 'INR',
        value: price * quantity,
        items: [{ item_id: itemId, item_name: itemName, item_variant: itemVariant, price, quantity }],
      },
    });
  } catch (error) {
    console.warn('[Analytics]', 'trackAddToCart:', error);
  }
}

export function trackRemoveFromCart({ itemId, itemName, itemVariant, price, quantity = 1 }) {
  try {
    pushEvent({
      event: 'remove_from_cart',
      ecommerce: {
        currency: 'INR',
        value: price * quantity,
        items: [{ item_id: itemId, item_name: itemName, item_variant: itemVariant, price, quantity }],
      },
    });
  } catch (error) {
    console.warn('[Analytics]', 'trackRemoveFromCart:', error);
  }
}

export function trackViewItemList({ items, listId, listName }) {
  try {
    pushEvent({
      event: 'view_item_list',
      ecommerce: {
        item_list_id: listId,
        item_list_name: listName,
        items: items.map((item, index) => ({
          item_id: item.itemId,
          item_name: item.itemName,
          item_variant: item.itemVariant,
          price: item.price,
          index,
        })),
      },
    });
  } catch (error) {
    console.warn('[Analytics]', 'trackViewItemList:', error);
  }
}

export function trackBeginCheckout({ items, value }) {
  try {
    pushEvent({
      event: 'begin_checkout',
      ecommerce: {
        currency: 'INR',
        value,
        items: items.map((item) => ({
          item_id: item.itemId,
          item_name: item.itemName,
          item_variant: item.itemVariant,
          price: item.price,
          quantity: item.quantity,
        })),
      },
    });
  } catch (error) {
    console.warn('[Analytics]', 'trackBeginCheckout:', error);
  }
}

export function trackPurchase({ transactionId, value, shipping = 0, tax = 0, items }) {
  try {
    pushEvent({
      event: 'purchase',
      ecommerce: {
        transaction_id: transactionId,
        value,
        currency: 'INR',
        shipping,
        tax,
        items: items.map((item) => ({
          item_id: item.itemId,
          item_name: item.itemName,
          item_variant: item.itemVariant,
          price: item.price,
          quantity: item.quantity,
        })),
      },
    });
  } catch (error) {
    console.warn('[Analytics]', 'trackPurchase:', error);
  }
}

export function trackAddToWishlist({ itemId, itemName, itemVariant, price }) {
  try {
    pushEvent({
      event: 'add_to_wishlist',
      ecommerce: {
        currency: 'INR',
        value: price,
        items: [{ item_id: itemId, item_name: itemName, item_variant: itemVariant, price }],
      },
    });
  } catch (error) {
    console.warn('[Analytics]', 'trackAddToWishlist:', error);
  }
}
