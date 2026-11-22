// Every 5 minutes: applies COD pay-online links Razorpay reports as paid, closes
// expired ones, and finishes interrupted link creation — the safety net under the
// payment_link.* webhook (services/codPrepaidLink.service.js).
import cron from "node-cron";
import { isCodPrepaidLinkEnabled, reconcileCodPrepaidLinks } from "../services/codPrepaidLink.service.js";

const startCodPrepaidLinkReconcileJob = () => {
  cron.schedule("*/5 * * * *", async () => {
    if (!isCodPrepaidLinkEnabled()) return;
    try {
      const s = await reconcileCodPrepaidLinks();
      if (s.converted || s.closed || s.retried || s.failed) console.log(`[CRON][COD-LINK] ${JSON.stringify(s)}`);
    } catch (err) {
      console.error(`[CRON][COD-LINK] reconcile failed: ${err.message}`);
    }
  });
};

export default startCodPrepaidLinkReconcileJob;
