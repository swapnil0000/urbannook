import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGetProductByIdQuery } from "../../store/api/productsApi";
import SEOHead from "../../component/SEOHead";
import RevealCard from "../../component/RevealCard";
import VariantCard from "../../component/VariantCard";
import { trackViewItemList } from "../../utils/analytics";

/**
 * Middle layer between the shop grid and the PDP: shown after tapping a
 * product's model card on /products. Lists every variant of that one
 * product (own title, image, price) as its own card. Tapping a variant
 * card goes to the existing /product/:productId/:sku PDP route.
 */

const ProductVariantsPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { data: productResponse, isLoading, error } = useGetProductByIdQuery(productId);

  const product = productResponse?.data;
  const variants = product?.variantDetails || [];


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
    <div className="min-h-screen bg-paper relative font-inter text-ink selection:bg-brand selection:text-white pb-10">
      <SEOHead
        title={product?.productName ? `${product.productName} — UrbanNook` : "Choose a Variant"}
        description={product?.productDes || "Choose a variant of this UrbanNook product."}
        url={`/products/${productId}`}
      />

      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[120px] pointer-events-none"></div>

      <section className="pt-[1rem] pb-6 md:pt-[1rem] md:pb-5 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate("/products")}
            className="gl-lbl text-[11px] text-muted hover:text-brand mb-6 flex items-center gap-2 transition-colors"
          >
            <i className="fa-solid fa-arrow-left"></i> Back to Shop
          </button>

          {!isLoading && !error && product && (
            <>
              <h1 className="font-archivo text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-ink leading-[0.95] mb-2">
                {product.productName}
              </h1>
              {/* <p className="text-sm md:text-base text-green-50/70 font-light">
                Choose a variant below.
              </p> */}
            </>
          )}
        </div>
      </section>

      <section className="pb-24 px-4 md:px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center py-32">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-hair">
              <i className="fa-solid fa-triangle-exclamation text-4xl text-faint mb-4"></i>
              <h2 className="font-archivo text-2xl font-extrabold text-ink mb-2">Unable to load this product</h2>
              <p className="text-muted mb-6">Please check your connection and try again</p>
              <button
                onClick={() => window.location.reload()}
                className="gl-press bg-brand text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-brandHi transition-colors"
              >
                Retry Connection
              </button>
            </div>
          ) : variants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-hair">
              <i className="fa-solid fa-box-open text-4xl text-faint mb-4"></i>
              <h2 className="font-archivo text-2xl font-extrabold text-ink mb-2">No variants available</h2>
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
