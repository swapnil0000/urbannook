// Team / tester identities whose orders are not real sales. COPY of the
// admin repo: urbannook-admin/server/utils/testIdentities.js (TEST_IDENTITIES)
// — the source of truth. Add a tester there first, then here.
// Used to keep public numbers honest (GET /stats/public).

export const TEST_EMAILS = [
  "swapnilsrivastava1999@gmail.com",
  "swapnilsrivastav1999@gmail.com",
  "swapnil.srivastav@adda247.com",
  "swap@gmail.com",
  "dheerajap6@gmail.com",
  "dheerajofficial35@gmail.com",
  "dheerajpatnaik412@gmail.com",
  "dheeraj310522@gmail.com",
  "dheeraj@omli.in",
  "electramite@gmail.com",
  "shashwat@omli.in",
  "pmonu172@gmail.com",
  "prashantchandra355@gmail.com",
  "2019112@iiitdmj.ac.in",
  "yashk210700@gmail.com",
  "yashk8119@gmail.com",
  "yashk8119+@gmail.com",
  "garimamahendru8639@gmail.com",
  "vivekshukla3719@gmail.com",
  "qa-test@urbannook.in",
  "cuteguy2424@gmail.com",
];

export const TEST_MOBILES = [
  "6386455982",
  "9305506882",
  "9876534567",
  "7606072474",
  "9876543219",
  "9876543210",
  "9876543234",
  "6060724745",
  "7007973708",
  "9532657196",
  "9532657195",
  "9305506881",
  "6306292267",
  "8299638749",
  "9999999999",
  "8888888888",
];

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Storefront users that are team/testers (users.mobileNumber is a Number in prod). */
export function testUsersMatch() {
  return {
    $or: [
      { email: { $in: TEST_EMAILS.map((e) => new RegExp(`^${escapeRegex(e)}$`, "i")) } },
      { mobileNumber: { $in: [...TEST_MOBILES, ...TEST_MOBILES.map(Number)] } },
    ],
  };
}

/**
 * $match fragment that drops test orders from orders / instagramorders: the
 * QA flag, a ₹1 internal-coupon order (pass Coupon.isInternal ids), a tester
 * email (any case) or a tester mobile (by its last 10 digits — stored phones
 * have mixed shapes like "+91 98765 43210").
 * Same conditions as the admin repo's testOrderConditions().
 */
export function excludeTestOrdersMatch(internalCouponIds = []) {
  const email = (f) => ({ [f]: { $in: TEST_EMAILS.map((e) => new RegExp(`^${escapeRegex(e)}$`, "i")) } });
  const mobile = (f) => ({ [f]: { $in: TEST_MOBILES.map((m) => new RegExp(`${escapeRegex(m)}$`)) } });
  return {
    $nor: [
      { isTestOrder: true },
      email("userEmail"),
      email("guestInfo.email"),
      mobile("userMobile"),
      mobile("senderMobile"),
      mobile("receiverMobile"),
      mobile("guestInfo.mobile"),
      mobile("contactNumber"),
      ...(internalCouponIds.length ? [{ "coupon.couponCodeId": { $in: internalCouponIds } }] : []),
    ],
  };
}
