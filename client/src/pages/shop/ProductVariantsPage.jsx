import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGetProductByIdQuery, useGetProductsQuery } from "../../store/api/productsApi";
import { useGetProductPromotionsQuery } from "../../store/api/userApi";
import { bestOfferBadge } from "../../utils/offerBadge";
import SEOHead from "../../component/SEOHead";
import RevealCard from "../../component/RevealCard";
import VariantCard from "../../component/VariantCard";
import { useSiteCampaign } from "../../hooks/useSiteCampaign";
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
  // Offer badge on every card (server-rendered too, see entry-server.jsx)
  const { data: promoRes } = useGetProductPromotionsQuery(productId);
  const offerBadge = bestOfferBadge(promoRes?.data?.promotions);

  // subtle Diwali accents while a festive campaign is live
  const { active: festiveActive, can } = useSiteCampaign();
  const festive = festiveActive && can('sectionAccents');

  const product = productResponse?.data;
  // the top real sellers of this product's designs (all-time units) get a Bestseller chip
  // sales figures come from the list API (same cached query as the header)
  const { data: listRes } = useGetProductsQuery({ page: 1, limit: 24 });
  const soldSource = (listRes?.data?.listofPublishedProducts || []).find((x) => x.productId === product?.productId) || product;
  const topSellers = new Set((soldSource?.variantDetails || []).filter((v) => Number(v.soldTotal) > 0)
    .sort((a, b) => Number(b.soldTotal) - Number(a.soldTotal)).slice(0, 3).map((v) => v.sku));
  const variants = product?.variantDetails || [];
  const fromPrice = Math.min(...variants.map((v) => Number(v.variantPrice) || Infinity));


  useEffect(() => {
    if (product && variants.length > 0) {
      trackViewItemList({
        listName: `${product.productName} - Variants`,
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
        title={product?.productName || "Choose a Variant"}
        description={product?.productDes || "Choose a variant of this UrbanNook product."}
        url={`/product/${productId}`}
      />

      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[120px] pointer-events-none"></div>
      {festive && <div className="pointer-events-none absolute inset-x-0 top-0 h-[360px]" style={{ background: 'radial-gradient(60% 100% at 50% 0%, rgb(var(--gl-star) / 0.16), transparent 70%)' }} aria-hidden="true" />}

      <section className="pt-8 pb-4 md:pt-6 md:pb-5 px-4 md:px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate("/products")}
            className="gl-lbl text-[11px] text-muted hover:text-brand mb-3 md:mb-6 flex items-center gap-2 transition-colors"
          >
            <i className="fa-solid fa-arrow-left"></i> Back to Shop
          </button>

          {!isLoading && !error && product && (
            <>
              <h1 className="font-archivo text-[28px] sm:text-5xl md:text-6xl font-extrabold tracking-tight text-ink leading-[1.05] sm:leading-[0.95] mb-1.5 md:mb-2">
                {product.productName}
              </h1>
              {variants.length > 0 && (
                <p className="text-[13px] md:text-sm text-muted">
                  {variants.length} {variants.length === 1 ? "design" : "designs"}
                  {Number.isFinite(fromPrice) && <> · from <span className="font-bold text-ink">₹{fromPrice.toLocaleString("en-IN")}</span></>}
                </p>
              )}
              {festive && <span className="mt-3 block h-[3px] w-16 bg-gradient-to-r from-brand via-star to-transparent" aria-hidden="true" />}
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
            <>
            {/* same density as the shop grid: 2 per row on phones, 4 on desktop */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
              {variants.map((variant, index) => (
                <RevealCard key={variant._id || variant.sku || index} index={index}>
                  <VariantCard
                    productId={product.productId}
                    productName={product.productName}
                    variant={variant}
                    index={index}
                    offerBadge={offerBadge}
                    demand={topSellers.has(variant.sku) ? 'Bestseller' : null}
                  />
                </RevealCard>
              ))}
            </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default ProductVariantsPage;
