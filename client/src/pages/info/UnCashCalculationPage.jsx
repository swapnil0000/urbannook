import { useEffect } from "react";
import SEOHead from "../../component/SEOHead";
import { useGetLoyaltySummaryQuery } from "../../store/api/userApi";

// Fallbacks only for logged-out visitors (the live query needs auth) — kept in
// sync with server/src/services/loyalty.service.js's DEFAULT_CONFIG so a guest
// viewing this page before signing in still sees numbers that match what
// they'll actually get once the config has been fetched for real.
const FALLBACK_VALUE_IN_RUPEES = 1;
const FALLBACK_EARN_PERCENT = 2;
const FALLBACK_MAX_REDEEM_PERCENT = 20;

const UnCashCalculationPage = () => {
  const { data: loyaltyData } = useGetLoyaltySummaryQuery();
  const loyalty = loyaltyData?.data;

  const UNCASH_VALUE_IN_RUPEES = loyalty?.pointToRupeeRatio ?? FALLBACK_VALUE_IN_RUPEES;
  const UNCASH_EARN_PERCENT = loyalty?.earnPercent ?? FALLBACK_EARN_PERCENT;
  const UNCASH_MAX_REDEEM_PERCENT = loyalty?.maxRedeemPercentOfCart ?? FALLBACK_MAX_REDEEM_PERCENT;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f5f0] px-4 pb-16 pt-28 text-[#2e443c] md:px-8">
      <SEOHead
        title="UnCash Calculation"
        description="Understand how UrbanNook UnCash converts into order discounts and how much UnCash can be used on one order."
        url="/uncash-calculation"
      />
      <div className="mx-auto max-w-3xl">
        <header className="rounded-2xl bg-[#2e443c] px-6 py-8 text-white md:px-10 md:py-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#f5deb3]">Urbannook Moni</p>
          <h1 className="mt-3 text-3xl font-bold md:text-4xl">UnCash calculation</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">
            Use your active UnCash balance as a discount during checkout.
          </p>
          <div className="mt-7 inline-flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
            <i className="fa-solid fa-coins text-[#f5deb3]" />
            <span className="font-bold">1 UnCash = ₹1</span>
          </div>
        </header>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm md:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a89068]">How it works</p>
          <h2 className="mt-2 text-2xl font-bold">Generic calculation</h2>
          <p className="mt-4 text-sm leading-7 text-gray-600">
            You earn UnCash after a delivered order, and you can use it as a discount on a future order. The value stays simple: <strong className="text-[#2e443c]">1 UnCash = ₹1</strong>.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-[#f7f5f0] p-4 text-sm">
              <p className="font-bold text-[#2e443c]">How much you earn</p>
              <p className="mt-2 font-semibold text-[#2e443c]">UnCash earned = order value × {UNCASH_EARN_PERCENT}%</p>
            </div>
            <div className="rounded-xl bg-[#f7f5f0] p-4 text-sm">
              <p className="font-bold text-[#2e443c]">How discount is calculated</p>
              <p className="mt-2 font-semibold text-[#2e443c]">Discount = UnCash used × ₹{UNCASH_VALUE_IN_RUPEES}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-gray-600">
            On one order, the maximum UnCash you can use is <strong className="text-[#2e443c]">{UNCASH_MAX_REDEEM_PERCENT}% of the product value</strong>. The actual limit is the lower of your active UnCash balance and this order limit.
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-[#e7dfd1] bg-[#fffdf8] p-6 md:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a89068]">Example</p>
          <h2 className="mt-2 text-2xl font-bold">On a ₹5,000 order</h2>
          <div className="mt-5 space-y-3 text-sm text-gray-600">
            <div className="flex justify-between gap-4 border-b border-[#eee6d9] pb-3">
              <span>Order product value</span>
              <strong className="text-[#2e443c]">₹5,000</strong>
            </div>
            <div className="flex justify-between gap-4 border-b border-[#eee6d9] pb-3">
              <span>UnCash earned on this order ({UNCASH_EARN_PERCENT}%)</span>
              <strong className="text-[#2e443c]">{(5000 * UNCASH_EARN_PERCENT) / 100} UnCash</strong>
            </div>
            <div className="flex justify-between gap-4 border-b border-[#eee6d9] pb-3">
              <span>Maximum allowed usage ({UNCASH_MAX_REDEEM_PERCENT}%)</span>
              <strong className="text-[#2e443c]">{(5000 * UNCASH_MAX_REDEEM_PERCENT) / 100} UnCash</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span>Maximum discount</span>
              <strong className="text-emerald-600">₹{(5000 * UNCASH_MAX_REDEEM_PERCENT) / 100}</strong>
            </div>
          </div>
          <p className="mt-5 text-xs leading-5 text-gray-500">
            If you have 600 UnCash, you can use 600 and get ₹600 off. If you have 2,000 UnCash, only 1,000 can be used on this ₹5,000 order because of the {UNCASH_MAX_REDEEM_PERCENT}% limit.
          </p>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-shield-halved mt-1 text-[#a89068]" />
            <div>
              <h2 className="text-xl font-bold">Maximum usage on one order</h2>
              <p className="mt-3 text-sm leading-7 text-gray-600">
                You can use up to {UNCASH_MAX_REDEEM_PERCENT}% of the product value in one order. This keeps UnCash from paying for the complete order. Any balance that is not used stays active in your account for a future order.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default UnCashCalculationPage;
