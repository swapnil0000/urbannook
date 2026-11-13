import { useGetCouponOffersQuery } from '../../store/api/userApi';
import { useAuth } from '../../hooks/useRedux';
import ProductOffers from '../offers/ProductOffers';
import CouponOffersSection from '../offers/CouponOffersSection';
import SaleDealBox from '../festive/SaleDealBox';

/**
 * ONE collapsed "Available offers (N)" row for the product page. Inside: the live sale countdown, this product's offers
 * (real conditions + Apply) and the coupons. A native <details>, so every word stays in the page markup (crawlers, screen
 * readers, the server-rendered coupon list) and nothing changes about how offers or coupons work. Renders nothing when
 * the product has no offer and there is no coupon.
 */
const OffersDisclosure = ({ productId, promos = [], ...offerProps }) => {
  const { user, isAuthenticated } = useAuth();
  const { data: couponRes } = useGetCouponOffersQuery(isAuthenticated ? user?.userId || 'user' : 'guest');
  const live = promos.filter((p) => p.fullyFunctional !== false);
  const coupons = (couponRes?.data || []).length;
  const total = live.length + coupons;
  if (!total) return null;
  const best = [...live].sort((a, b) => (a.displayRank ?? 99) - (b.displayRank ?? 99))[0];
  const teaser = best ? best.rewardLabel || best.title : `${coupons} ${coupons === 1 ? 'coupon' : 'coupons'} available`;
  return (
    <details className="pdp-offers" id="pdp-offers">
      <summary>
        <span className="pdp-offers-t">
          <span className="font-mono uppercase">Available offers ({total})</span>
          {teaser && <span className="pdp-offers-s">{teaser}</span>}
        </span>
        <span className="pdp-plus" aria-hidden="true" />
      </summary>
      <div className="pdp-offers-body">
        <SaleDealBox className="mb-3" />
        <ProductOffers productId={productId} {...offerProps} />
        <CouponOffersSection variant="pdp" />
      </div>
    </details>
  );
};

export default OffersDisclosure;
