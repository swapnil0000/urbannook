import { useSiteCampaign } from '../../hooks/useSiteCampaign';
import Phuljadi from './Phuljadi';

/**
 * Slot that normally shows the plain progress bar (`fallback`). While a festive
 * campaign with the Phuljadi switched on is live — for this location, device
 * and an existing live promotion — it shows the Phuljadi instead. As soon as
 * the campaign or that promotion ends, or the admin turns it off, the
 * original bar is back (the server stops sending `phuljadi`).
 *
 * @param {'cart'|'miniCart'|'product'} location
 */
// Phuljadi is switched off for now (set to true to bring it back; the rest of the wiring is untouched).
const PHULJADI_ENABLED = false;

const OfferProgress = ({ location, fallback = null, className = '' }) => {
  const { phuljadi, isMobile } = useSiteCampaign();
  if (!PHULJADI_ENABLED || !phuljadi || !phuljadi.locations?.[location] || (isMobile && !phuljadi.showOnMobile)) return fallback;
  return <Phuljadi promotionId={phuljadi.promotionId} intensity={phuljadi.intensity} className={className} fallback={fallback} />;
};

export default OfferProgress;
