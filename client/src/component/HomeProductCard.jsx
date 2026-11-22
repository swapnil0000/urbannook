import { trackSelectItem } from '../utils/analytics';
import { firstVariant, productImg, secondImg, productHref } from '../utils/productCardData';
import ShopProductCard from './ShopProductCard';

// Ordinary homepage product cards use the same image/title/price hierarchy as
// Shop All. Editorial collection tiles and campaign banners are separate.
const HomeProductCard = ({ p, image, index = 0, listId = 'grid', listName = 'Grid' }) => {
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
    href={productHref(p)}
    onClick={track}
    title={p.productName}
    image={image || productImg(p)}
    secondaryImage={image ? null : secondImg(p)}
    price={p?.effectivePrice ?? variant.variantPrice}
    mrp={p?.effectiveMrp ?? variant.variantMrp}
  />;
};

export default HomeProductCard;
