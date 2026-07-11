import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useGetFreeShippingBannerQuery, useAddToCartMutation } from "../store/api/userApi";
import { useGetProductByIdQuery } from "../store/api/productsApi";
import { addItem, updateSelection } from "../store/slices/cartSlice";
import { useCartData } from "../hooks/useCartSync";
import { trackAddToCart } from "../utils/analytics";

/**
 * Cross-sell card shown below a product's image: "add this other product,
 * unlock free shipping." Admin controls text/target product via the
 * FreeShippingOffer banners in the admin panel. Actual free-shipping
 * eligibility is a cart-value threshold checked at checkout — this card
 * doesn't compute or guarantee it, just points the customer at it.
 */
const FreeShippingBanner = ({ productId }) => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { refetch: refetchCart } = useCartData();
  const [addToCartAPI, { isLoading: isAdding }] = useAddToCartMutation();

  const [selectedVariant, setSelectedVariant] = useState(null);
  const [added, setAdded] = useState(false);

  const { data: bannerRes } = useGetFreeShippingBannerQuery(productId, { skip: !productId });
  const banner = bannerRes?.data;

  const { data: recommendedRes } = useGetProductByIdQuery(banner?.recommendedProductId, {
    skip: !banner?.recommendedProductId,
  });
  const recommendedProduct = recommendedRes?.data;
  const variants = recommendedProduct?.variantDetails || [];

  useEffect(() => {
    if (variants.length > 0 && !selectedVariant) setSelectedVariant(variants[0].variantName);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only seed once when variants first load
  }, [recommendedProduct?.productId]);

  if (!banner || !recommendedProduct) return null;

  const activeVariant =
    variants.find((v) => v.variantName === selectedVariant) || variants[0];
  const displayImage = activeVariant?.variantImage?.[0] || recommendedProduct.productImg || "https://urbannook.in/assets/logo.webp";
  const displayPrice = activeVariant?.variantPrice ?? 0;

  const handleAddToCart = async () => {
    const effectiveVariant = activeVariant?.variantName || "Standard Variant";
    const hasToken = !!localStorage.getItem("authToken");
    const isLoggedIn = isAuthenticated || hasToken;

    if (isLoggedIn) {
      try {
        await addToCartAPI({
          productId: recommendedProduct.productId,
          quantity: 1,
          variant: effectiveVariant,
          image: displayImage,
        }).unwrap();
        dispatch(updateSelection({ productId: recommendedProduct.productId, quantity: 1, variant: effectiveVariant }));
        await refetchCart().unwrap();
      } catch {
        return; // swallow — this card is a nudge, not the primary add-to-cart flow
      }
    } else {
      dispatch(
        addItem({
          id: recommendedProduct.productId,
          mongoId: recommendedProduct.productId,
          name: recommendedProduct.productName,
          price: displayPrice,
          image: displayImage,
          quantity: 1,
          selectedVariant: effectiveVariant,
        }),
      );
    }

    trackAddToCart({
      itemId: recommendedProduct.productId,
      itemName: recommendedProduct.productName,
      itemVariant: effectiveVariant,
      price: displayPrice,
      quantity: 1,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  return (
    <div className="mt-4 rounded-2xl border border-[#F5DEB3]/25 bg-[#F5DEB3]/[0.06] overflow-hidden">
      {/* Header strip */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#F5DEB3]/10 border-b border-[#F5DEB3]/15">
        <i className="fa-solid fa-truck-fast text-[#F5DEB3] text-xs" />
        <p className="text-xs font-bold uppercase tracking-wide text-[#F5DEB3]">
          {banner.text}
        </p>
      </div>

      {/* Product card body */}
      <div className="p-4 flex gap-4">
        <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-[#1c3026]/40 border border-[#F5DEB3]/10">
          <img
            src={displayImage}
            alt={recommendedProduct.productName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{recommendedProduct.productName}</p>
          <p className="text-sm font-semibold text-[#F5DEB3] mt-0.5">₹{displayPrice.toLocaleString()}</p>

          {variants.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {variants.map((v) => (
                <button
                  key={v.variantName}
                  onClick={() => setSelectedVariant(v.variantName)}
                  className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border transition-colors ${
                    v.variantName === selectedVariant
                      ? "bg-[#F5DEB3] text-[#1c3026] border-[#F5DEB3]"
                      : "border-[#F5DEB3]/30 text-[#F5DEB3]/80 hover:bg-[#F5DEB3]/10"
                  }`}
                >
                  {v.variantName}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-4">
        {added ? (
          <div className="w-full py-2.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wide text-center">
            <i className="fa-solid fa-check mr-1.5" /> Added to cart
          </div>
        ) : (
          <button
            onClick={handleAddToCart}
            disabled={isAdding}
            className="w-full py-2.5 rounded-full bg-[#F5DEB3] text-[#1c3026] text-xs font-bold uppercase tracking-wide hover:bg-white transition-colors disabled:opacity-50"
          >
            {isAdding ? "Adding…" : (banner.ctaLabel || "Add to Cart")}
          </button>
        )}
      </div>
    </div>
  );
};

export default FreeShippingBanner;
