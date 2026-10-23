# Festive campaigns (Diwali theme, decorations, offers section)

Admin: **Operations Hub -> Festive** writes `siteCampaigns` (admin repo
`server/models/siteCampaign.model.js`, mirrored read-only in
`server/src/model/siteCampaign.model.js`). Offer cards are ordinary Promotions
(placement "Homepage combo card" + `homeCard` fields) edited on the Promotions
page - prices are never typed, they come from the real promotion engine.

## Who decides what is live
- `GET /site-campaign/active` - the storefront server's clock vs the admin's
  Asia/Kolkata window + the enabled switch. Never cached. Expired or disabled =
  `campaign: null` = the normal site (no theme flag, decorations, festive ticker
  messages or festive section copy). The browser only runs a convenience timer
  (server-skew corrected) and re-asks the server.
- Messages/sections/page line linked to a promotion show only while that
  promotion is live.
- Preview: `GET /site-campaign/preview/:id?key=...` (random per-campaign
  `previewKey`, admin-only, constant-time compare), opened via
  `?festivePreview=<id>.<key>`; that tab only, ignores dates.

## Storefront pieces
`hooks/useSiteCampaign.js` (one request per load; `can(effect)` gates by
element / page type / device), `component/festive/*` (lights, torans, diyas,
sparkles, fireworks canvas, rangoli, countdown, section decor, gifting section),
`component/ComboOfferSection.jsx` (offers zone, 4:5 media).
Colors are site tokens only (`--gl-*`); there is no festive-only palette.
Checkout/payment pages never get decorations.
