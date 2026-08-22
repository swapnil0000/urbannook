import { useEffect, useState } from 'react';
import { CONFIG_FALLBACK, fetchCampaignTerms } from '../config/independenceOffer';

/**
 * The Independence Day offer's live terms, read from the server.
 *
 * Every consumer gets the coupon's current code, amount and minimum straight
 * from the coupon document, so an admin rename or re-price shows up on the next
 * page load without a rebuild. Starts on the bundled fallback so nothing has to
 * render a spinner, and swaps in the real values as soon as they arrive.
 *
 * @returns {{terms: object, loaded: boolean}}
 */
export default function useOfferTerms() {
  const [terms, setTerms] = useState(CONFIG_FALLBACK);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchCampaignTerms().then((next) => {
      if (!alive) return;
      setTerms(next || CONFIG_FALLBACK);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { terms, loaded };
}
