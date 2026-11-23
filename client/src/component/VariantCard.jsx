import { trackSelectItem } from '../utils/analytics';
import ShopProductCard from './ShopProductCard';
import { isVariantOutOfStock } from '../utils/variantStock';

// Variant-list page keeps each design's own crawlable PDP URL and analytics.
const VariantCard = ({ productId, productName, variant, index, listId = 'product_variants', listName }) => {
  const price = Number(variant?.variantPrice || 0);
  const href = `/product/${productId}/${encodeURIComponent(variant?.sku || variant?.variantName)}`;
  const track = () => trackSelectItem({
    itemId: productId,
    itemName: productName,
    itemVariant: variant?.variantName,
    price,
    listId,
    listName: listName || `${productName} - Variants`,
    index,
  });

  return <ShopProductCard
    href={href}
    onClick={track}
    title={variant?.variantName || productName}
    image={variant?.variantImage?.[0] || '/assets/logo.webp'}
    price={price}
    mrp={variant?.variantMrp}
    showStock
    outOfStock={isVariantOutOfStock(variant)}
  />;
};

export default VariantCard;
