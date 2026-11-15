// Checkout A/B trials. The browser picks the arm (client/src/config/checkoutExperiment.js)
// and sends it with the order; only names listed here are stored, so the field
// can be trusted when the arms are compared.
//
// magic_vs_standard_2026_11: half the shoppers pay online through Razorpay Magic
// (Express, no forms), half through the ordinary steps and the standard Razorpay
// modal. Magic prepaid orders were failing ~72% of the time; this measures
// whether the plain checkout sells more.
const EXPERIMENTS = {
  magic_vs_standard_2026_11: ["magic", "standard"],
};

export const checkoutExperimentFrom = (raw) => {
  const name = String(raw?.name || "");
  const arm = String(raw?.arm || "");
  return EXPERIMENTS[name]?.includes(arm) ? { name, arm } : undefined;
};
