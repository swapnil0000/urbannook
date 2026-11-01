// Sale bar rotation, built only from live data: admin's campaign messages
// first; without any, the theme headline + the live combo promotions
// (GET promotions/display/home) + the public coupon offers (POST coupon/offers).
// Nothing is written here: every word comes from admin-configured records.

import { offerName } from './offerName';

const MAX_MESSAGES = 10;

// A label still carrying a template slot ("Combo Savings {save}") is only
// filled in per cart; never show the raw placeholder.
const clean = (s) => (typeof s === 'string' && s.trim() && !/[{}]/.test(s) ? s.trim() : '');

// Where a combo really leads, in the same order of truth as the home combo
// cards: admin's link, then the offer's first product choice, then its primary
// product. No destination = no message (a generic /products link sent
// "Anime Figures" shoppers to the wrong page).
export const comboHref = (c) => {
  if (c?.ctaAction === 'link' && clean(c?.ctaUrl)) return c.ctaUrl.trim();
  const choice = (c?.choices || c?.ctaChoices || []).find((x) => clean(x?.url));
  if (choice) return choice.url;
  if (c?.primaryProductId) return `/products/${c.primaryProductId}`;
  return null;
};

export const comboMessage = (c, nameById) => {
  const title = clean(offerName(c, nameById)) || clean(c?.title);
  const to = comboHref(c);
  if (!title || !to) return null;
  return { key: `combo-${c.id}`, text: title, to };
};

export const couponMessage = (o) => {
  const text = clean(o?.summary) || clean(o?.title);
  return text ? { key: `coupon-${o.id}`, text, to: '/offers' } : null;
};

// Offers lead (what's in it for the shopper), store promises are woven in
// after every couple of offers (why buy here), admin messages win outright.
export const buildSaleBarMessages = ({ adminMessages = [], saleTitle = '', combos = [], coupons = [], promises = [], nameById } = {}) => {
  if (adminMessages.length) return adminMessages.map((m) => ({ key: m.id, text: m.text, to: m.linkUrl }));
  const offers = [
    ...(saleTitle ? [{ key: 'theme', text: saleTitle, to: '/offers' }] : []),
    ...combos.map((c) => comboMessage(c, nameById)),
    ...coupons.filter((o) => !o?.membersOnly).map(couponMessage),
  ].filter(Boolean);
  const out = [];
  const trust = promises.map((text) => ({ key: `promise-${text}`, text, to: '/products' }));
  offers.forEach((m, i) => { out.push(m); if (i % 2 === 1 && trust.length) out.push(trust.shift()); });
  return [...out, ...trust].slice(0, MAX_MESSAGES);
};
