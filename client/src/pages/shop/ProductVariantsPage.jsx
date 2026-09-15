import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGetProductByIdQuery } from "../../store/api/productsApi";
import SEOHead from "../../component/SEOHead";
import RevealCard from "../../component/RevealCard";
import { trackViewItemList, trackSelectItem } from "../../utils/analytics";

/**
 * Middle layer between the shop grid and the PDP: shown after tapping a
 * product's model card on /products. Lists every variant of that one
 * product (own title, image, price) as its own card. Tapping a variant
 * card goes to the existing /product/:productId/:sku PDP route.
 */
const VariantCard = ({ productId, productName, variant, index }) => {
  const navigate = useNavigate();

  const price = Number(variant?.variantPrice || 0);
  const mrp = Number(variant?.variantMrp || 0);
  const thumbnail = variant?.variantImage?.[0] || "/placeholder.jpg";
  const oos =
    variant?.variantOutOfStock === true ||
    (variant?.variantQuantity != null && Number(variant.variantQuantity) <= 0);

  const goToVariant = () => {
    trackSelectItem({
      itemId: productId,
      itemName: productName,
      itemVariant: variant?.variantName,
      price,
      listId: "product_variants",
      listName: `${productName} — Variants`,
      index,
    });
    navigate(`/product/${productId}/${variant?.sku || variant?.variantName}`);
  };

  return (
    <div
      onClick={goToVariant}
      className="group relative rounded-[1.6rem] overflow-hidden bg-black/20 border border-white/5 shadow-lg hover:shadow-2xl hover:border-[#F5DEB3]/30 transition-all duration-500 flex flex-col h-full cursor-pointer"
    >
      <div className="relative w-full aspect-square bg-[#f8f8f5] overflow-hidden">
        <img
          src={thumbnail}
          alt={variant?.variantName || productName}
          className="w-full h-full object-cover mix-blend-multiply transition-transform duration-[1.5s] group-hover:scale-110"
        />
        {oos && (
          <span className="absolute top-3 left-3 z-10 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-red-500 text-white shadow">
            Out of Stock
          </span>
        )}
      </div>

      <div className="p-4 md:p-4 flex flex-col flex-grow bg-[#f5f7f8]">
        <h3 className="font-serif text-gray-500 text-base md:text-lg leading-snug line-clamp-2 mb-2">
          {variant?.variantName}
        </h3>

        <div className="flex justify-between items-end pt-2 border-t border-[#F5DEB3]/10 mt-auto">
          <div className="flex items-center flex-nowrap gap-1 md:gap-1.5 min-w-0">
            <span className="text-base md:text-xl font-bold text-[#a89068] whitespace-nowrap">
              ₹{price?.toLocaleString()}
            </span>
            {mrp > price && (
              <span className="flex flex-col items-start leading-none whitespace-nowrap">
                <span className="text-[7px] md:text-[9px] font-bold text-[#157a44]">
                  {Math.round(((mrp - price) / mrp) * 100)}% OFF
                </span>
                <span className="text-[9px] md:text-xs text-gray-400 line-through mt-0.5">
                  ₹{mrp?.toLocaleString()}
                </span>
              </span>
            )}
          </div>

          <div className="hidden md:flex w-12 h-12 rounded-full bg-[#F5DEB3]/10 text-gray-500 items-center justify-center group-hover:bg-[#F5DEB3] group-hover:text-[#2e443c] transition-all duration-300">
            <i className="fa-solid fa-arrow-right -rotate-45 group-hover:rotate-0 transition-transform duration-500"></i>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductVariantsPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { data: productResponse, isLoading, error } = useGetProductByIdQuery(productId);

  const product = productResponse?.data;
  const variants = product?.variantDetails || [];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [productId]);

  useEffect(() => {
    if (product && variants.length > 0) {
      trackViewItemList({
        listName: `${product.productName} — Variants`,
        listId: "product_variants",
        items: variants.map((v, index) => ({
          itemId: product.productId,
          itemName: product.productName,
          price: v.variantPrice || 0,
          itemVariant: v.variantName || "",
          index,
        })),
      });
    }
  }, [product, variants]);

  return (
    <div className="min-h-screen bg-[#2e443c] relative font-sans selection:bg-[#F5DEB3] selection:text-[#2e443c] pb-10">
      <SEOHead
        title={product?.productName ? `${product.productName} — UrbanNook` : "Choose a Variant"}
        description={product?.productDes || "Choose a variant of this UrbanNook product."}
        url={`/products/${productId}`}
      />

      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F5DEB3]/5 rounded-full blur-[120px] pointer-events-none"></div>

      <section className="pt-[5rem] pb-8 md:pt-[7rem] md:pb-5 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate("/products")}
            className="text-[#F5DEB3]/70 hover:text-[#F5DEB3] text-xs uppercase tracking-widest font-bold mb-6 flex items-center gap-2"
          >
            <i className="fa-solid fa-arrow-left"></i> Back to Shop
          </button>

          {!isLoading && !error && product && (
            <>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-white leading-[0.9] mb-2">
                {product.productName}
              </h1>
              <p className="text-sm md:text-base text-green-50/70 font-light">
                Choose a variant below.
              </p>
            </>
          )}
        </div>
      </section>

      <section className="pb-24 px-4 md:px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center py-32">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#F5DEB3]"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-32 bg-black/10 rounded-[2rem] border border-white/5 backdrop-blur-sm">
              <i className="fa-solid fa-triangle-exclamation text-4xl text-[#F5DEB3]/50 mb-4"></i>
              <h2 className="text-2xl font-serif text-white mb-2">Unable to load this product</h2>
              <p className="text-green-50/60 mb-6 font-light">Please check your connection and try again</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-[#F5DEB3] text-[#2e443c] px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-white transition-colors"
              >
                Retry Connection
              </button>
            </div>
          ) : variants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 bg-black/10 rounded-[2rem] border border-white/5 backdrop-blur-sm">
              <i className="fa-solid fa-box-open text-4xl text-[#F5DEB3]/50 mb-4"></i>
              <h2 className="text-2xl font-serif text-white mb-2">No variants available</h2>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {variants.map((variant, index) => (
                <RevealCard key={variant._id || variant.sku || index} index={index}>
                  <VariantCard
                    productId={product.productId}
                    productName={product.productName}
                    variant={variant}
                    index={index}
                  />
                </RevealCard>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ProductVariantsPage;
