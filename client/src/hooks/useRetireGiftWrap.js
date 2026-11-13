import { useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useToggleGiftWrapMutation } from "../store/api/userApi";
import { setGiftWrap } from "../store/slices/cartSlice";
import { useCartData } from "./useCartSync";

/**
 * Gift wrap is no longer offered on the site (its add / remove UI is gone).
 * A cart that picked it earlier would still be charged for it - the server
 * prices `cart.giftWrap` while Admin -> Offers -> Gift Wrap is on - with no
 * button left to take it off. So wherever the total is shown (cart, checkout)
 * this takes it off once, the same way the old "Remove" did: the saved cart
 * for a signed-in shopper, the local cart for a guest.
 */
export function useRetireGiftWrap() {
  const dispatch = useDispatch();
  const selected = useSelector((state) => state.cart.giftWrap);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [toggleGiftWrap] = useToggleGiftWrapMutation();
  const { refetch: refetchCart } = useCartData();
  const done = useRef(false);

  useEffect(() => {
    if (!selected || done.current) return;
    done.current = true;
    const off = { selected: false, noteOptions: ["none"] };
    const signedIn = isAuthenticated || !!localStorage.getItem("authToken");
    if (!signedIn) {
      dispatch(setGiftWrap(off));
      return;
    }
    toggleGiftWrap(off).unwrap()
      .then(() => { dispatch(setGiftWrap(off)); return refetchCart(); })
      .catch((err) => { done.current = false; console.error("Removing gift wrap failed:", err); });
  }, [selected, isAuthenticated, dispatch, toggleGiftWrap, refetchCart]);
}
