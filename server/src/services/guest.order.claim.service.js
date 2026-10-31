import Order from '../model/order.model.js';
import User from '../model/user.model.js';

// Only gateway payment contact is eligible, never a delivery/recipient number.
export const capturedGuestContact = (order, payment) => {
  if (!order.isGuestOrder || payment?.status !== 'captured' ||
      !payment.id || payment.order_id !== order.payment?.razorpayOrderId) return null;
  let digits = String(payment.contact ?? '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
};

export const claimPaidGuestOrders = async (userId) => {
  const user = await User.findOne({ userId }).select('userId verifiedMobile isSuspended').lean();
  const mobile = String(user?.verifiedMobile ?? '');
  if (!user || user.isSuspended || !/^[6-9]\d{9}$/.test(mobile)) return 0;

  // Do not guess between duplicate identities or merge existing accounts.
  const numbers = [Number(mobile), Number(`91${mobile}`)];
  const identities = await User.find({ $or: [
    { mobileNumber: { $in: numbers } }, { verifiedMobile: { $in: numbers } },
  ] }).select('userId').limit(2).lean();
  if (identities.length !== 1 || identities[0].userId !== userId) return 0;

  const result = await Order.updateMany({
    isGuestOrder: true,
    userId: /^guest_/,
    // A captured order can already be shipped/delivered when the buyer logs in.
    status: { $in: ['PAID', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] },
    'payment.guestClaimContact': mobile,
    'payment.razorpayPaymentId': { $type: 'string', $ne: '' },
  }, [{ $set: {
    'guestAccountClaim.previousUserId': '$userId',
    'guestAccountClaim.claimedAt': '$$NOW',
    userId: { $literal: userId },
  } }]);
  // Order emails, guest provenance, payment, fulfilment and stock stay intact.
  return result.modifiedCount;
};
