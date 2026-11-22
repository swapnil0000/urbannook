// The COD balance on offer online (services/codPrepaidLink.service.js), as the
// customer sees it: only while the link is open on a still-COD order. Shared by
// the order page (orderView.service) and the order-status poll the guest
// confirmation screen reads.
const rupees = (v) => Math.round((Number(v) || 0) * 100) / 100;

export const payOnlineOfferOf = (order, now = new Date()) => {
  const c = order?.codConversion;
  if (order?.paymentMethod !== "COD" || c?.status !== "sent" || !c.shortUrl || !c.expiresAt) return null;
  const expiresAt = new Date(c.expiresAt);
  if (expiresAt.getTime() <= now.getTime()) return null;
  return { url: c.shortUrl, amount: rupees(c.amount), feeWaived: rupees(c.feeWaived), expiresAt: expiresAt.toISOString() };
};
