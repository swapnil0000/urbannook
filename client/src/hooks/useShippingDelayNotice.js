import { useSelector } from "react-redux";
import {
  SHIPPING_DELAY_PRODUCT_ID,
  SHIPPING_DELAY_MESSAGE,
  SHIPPING_DELAY_EXPIRES_AT,
} from "../config/shippingDelayNotice";
import { SITE_SHIPPING_NOTICE, SITE_SHIPPING_NOTICE_STARTS, SITE_SHIPPING_NOTICE_ENDS } from "../config/siteShippingNotice";

/**
 * Returns the shipping-delay message string when it should show, or null
 * otherwise — reused by both the site-wide ticker and the checkout page, one
 * source of truth for the on/off logic. Shows only while:
 *   - the configured product is actually in the cart
 *   - the current time is before the configured expiry
 * Purely client-side/time-based (no DB, no admin panel) since this is a
 * one-off operational notice, not a promo — see config/shippingDelayNotice.js.
 */
export const useShippingDelayNotice = () => {
  const cartItems = useSelector((state) => state.cart.items);
  const hasProduct = cartItems.some(
    (i) => String(i.mongoId || i.id) === SHIPPING_DELAY_PRODUCT_ID,
  );
  if (!hasProduct) return null;
  if (new Date() >= SHIPPING_DELAY_EXPIRES_AT) return null;
  return SHIPPING_DELAY_MESSAGE;
};

/** The site-wide shipping note (ticker + checkout), only between its start and end dates, else null. */
export const useSiteShippingNotice = () => {
  const now = new Date();
  return now >= SITE_SHIPPING_NOTICE_STARTS && now < SITE_SHIPPING_NOTICE_ENDS ? SITE_SHIPPING_NOTICE : null;
};
