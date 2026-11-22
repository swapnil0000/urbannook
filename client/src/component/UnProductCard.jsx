import { trackSelectItem } from '../utils/analytics';
import { firstVariant, productImg, secondImg, productHref } from '../utils/productCardData';
import ShopProductCard from './ShopProductCard';

// Used by Shop All, category/collection pages, PDP recommendations and blog
// product links. Each caller keeps its existing href and analytics context.
const UnProductCard = ({ p, index = 0, listId = 'grid', listName = 'Grid', href }) => {
  const variant = firstVariant(p);
  const track = () => trackSelectItem?.({
    itemId: p.productId,
    itemName: p.productName,
    itemVariant: variant.variantName || '',
    price: variant.variantPrice || 0,
    listId,
    listName,
    index,
  });

  return <ShopProductCard
    href={href || productHref(p)}
    onClick={track}
    title={p.productName}
    image={productImg(p)}
    secondaryImage={secondImg(p)}
    price={p?.effectivePrice ?? variant.variantPrice}
    mrp={p?.effectiveMrp ?? variant.variantMrp}
  />;
};

export default UnProductCard;
