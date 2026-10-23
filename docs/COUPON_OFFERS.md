# Offers & Discounts coupon cards (homepage)

Compact ticket-style cards for the coupons the admin configured. The code stays hidden until the
customer's mobile number is verified. Placed on the homepage under the festive/offers sections.

## Where the data comes from
Only `couponcodes` documents (admin Coupons screen) — nothing is typed or hard-coded in the website.
A coupon is advertised only when it is: `scope=PUBLIC`, `isActive`, not archived, not test/internal,
not `isHidden`, `PERCENTAGE`/`FLAT` with a value, inside `validFrom`/`validUntil`, and not out of
`maxTotalUses`. Logged-in customers also no longer see coupons they already used up.
The "Terms" text is generated server-side from the fields that are actually set.

## Endpoints (server/src/services/coupon.offers.service.js)
| Endpoint | Auth | Returns |
|---|---|---|
| `POST /coupon/offers` | optional | cards + terms. **Never** the code, notes or product ids. |
| `POST /coupon/reveal` `{couponId, mobile}` | signed in | `{code}` only if the account's **verified** mobile equals `mobile` and the coupon passes `validateNewCoupon` (per-customer limit, validity, audience). Rate limited, `no-store`. |

## Verification (no new OTP system)
The site's mobile verification is the **WhatsApp login** (`whatsapp.auth.service.js`). It now also
stamps `User.verifiedMobile` (new field) when WhatsApp proves a number. `User.mobileNumber` can be
typed into a profile unverified, so reveal checks `verifiedMobile`, never `mobileNumber`.
Typing a number alone reveals nothing — the server refuses (`MOBILE_NOT_VERIFIED` / `MOBILE_MISMATCH`).
Customers who verified on WhatsApp *before* this change have no `verifiedMobile` yet and verify once more.

## Checkout is untouched
`/coupon/apply`, `/coupon/list`, promotion stacking and payment maths are unchanged. One coupon per
order still holds.

## Known gap
The cart's existing `POST /coupon/list` (the "available coupons" picker) still returns codes for
public, non-hidden coupons, so those codes are discoverable there. Hiding them behind verification
would change checkout behaviour and needs a product decision (alternatively mark a coupon "hidden"
in admin).
