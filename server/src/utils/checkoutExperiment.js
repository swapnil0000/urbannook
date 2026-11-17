// Checkout A/B trials. The browser picked the arm and sent it with the order; only names listed here are stored, so the field
// can be trusted when the arms are compared.
//
// magic_vs_standard_2026_11: half the shoppers paid online through Razorpay Magic
// (Express, no forms), half through the ordinary steps and the standard Razorpay
// modal. Ended 2026-11-17 (everyone on Magic again): the checkout no longer sends
// it, so only orders placed during the trial carry it. Kept so a stray or cached
// client is still validated and those orders stay readable.
const EXPERIMENTS = {
  magic_vs_standard_2026_11: ["magic", "standard"],
};

export const checkoutExperimentFrom = (raw) => {
  const name = String(raw?.name || "");
  const arm = String(raw?.arm || "");
  return EXPERIMENTS[name]?.includes(arm) ? { name, arm } : undefined;
};
