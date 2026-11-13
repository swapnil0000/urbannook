/**
 * Homepage redesign — every word and number of the redesigned sections lives here.
 * Colours come from the --gl-* tokens in index.css, fonts from tailwind.config.js
 * (archivo / inter / mono), type scale and spacing from the `.rd-*` block in index.css.
 * Components under component/home/ hold no copy of their own.
 */

export const GIFT_EDIT = {
  eyebrow: 'Thoughtfully picked',
  index: '01',
  heading: 'A little unexpected. A lot of joy.',
  // sub: 'For the ones who make your everyday brighter.',
  // {n} = how many products the admin has tagged Bestseller (shown, max `max`)
  count: ['{n} finds.', 'Endless personality.'],
  cardBadge: 'The gift edit',
  viewAll: 'Shop all',
  viewAllHref: '/products',
  off: '{pct}% off',
  max: 4,
  fallbackCategory: 'Urban Nook',
};

// Trust strip under the gift edit. `source` items are read live from GET /stats/public (shown only when there is data);
// the two without a source are store POLICIES (not statistics), so they live here as copy, not in the database.
// value → counts up; unit = small mark after it; stars → filled stars (aria-label carries the number).
export const TRUST = {
  label: 'Why people trust us',
  items: [
    // average of every approved review in the database (all products, Google imports included), out of 5
    { source: 'ratingAvg', decimals: 1, unit: '/5', label: 'Average rating', stars: 5 },
    { value: 2000, group: true, suffix: '+', label: 'Desks upgraded' },
    { value: 100, suffix: '%', label: 'Made in India' },
    { value: 7, suffix: '-day', label: 'Easy replacement' },
  ],
};

// "The UrbanNook way" band — brand promise next to the featured piece's photos (the photos come from the
// featured product's variant shots, see HomePage `carouselImages`). Figures are hand-maintained claims.
export const STATEMENT = {
  index: '04',
  eyebrow: 'The UrbanNook way',
  heading: 'Built to order. Not to sit in a warehouse.',
  // body: "Every piece is 3D-printed the moment you order it - less waste, sharper detail, and a finish you won't find on a shelf.",
  // `source` = a number read live from GET /stats/public (real delivered orders, real approved-review average / count).
  // An item with no data yet (0) is simply not shown. `round` floors big counts to a clean figure (947 → "940+").
  stats: [
    { source: 'ordersDelivered', round: 10, suffix: '+', label: 'Orders delivered' },
  ],
  goTo: 'Show photo {i}',
};

// The modal behind the "Verified Google reviews" figure. Every review in it is a real approved Google review read live
// from GET /stats/google-reviews (added in Admin → Product Reviews → Import Google); only the wording lives here.
export const GOOGLE_REVIEWS = {
  title: 'Verified Google reviews',
  summary: '{avg} average from {n} reviews',
  note: 'Real reviews from our Google profile, shown here exactly as customers wrote them.',
  forProduct: 'On {product}',
  loading: 'Loading reviews…',
  empty: 'No reviews to show right now.',
  error: "Couldn't load the reviews. Please try again.",
  retry: 'Try again',
  close: 'Close reviews',
  openHint: 'See the reviews',
  photoOpen: 'View photo',
  photoClose: 'Close photo',
  stars: '{n} out of 5 stars',
};

// Homepage "Loved by our customers": the real Google Business Profile reviews (GET /stats/google-business-reviews). Only wording
// lives here; the rating, count, names, dates and texts are read live and never typed.
export const GOOGLE_BUSINESS = {
  index: '04',
  eyebrow: 'On Google',
  heading: 'Loved by Our Customers',
  // sub: 'Real experiences. Real people. Real reviews.',
  source: 'Google reviews',
  basedOn: 'based on {n} reviews',
  basedOnOne: 'based on 1 review',
  viewAll: 'Read reviews on Google',
  write: 'Write a Google review',
  more: 'Show more reviews',
  readMore: 'Read more',
  readLess: 'Show less',
  reply: 'Reply from Urban Nook',
  stars: '{n} out of 5 stars',
  postedOnGoogle: 'Posted on Google',
  avatarAlt: 'Profile photo of {name}',
  initialCount: 9,
  step: 6,
  longAt: 230,
  longAtPhone: 110, // phone cards are a fixed size: text longer than this is cut with an ellipsis + "Read more"
  openPhoto: 'Open photo from {name}',
  photoAlt: 'Photo shared by {name} in a Google review of Urban Nook',
  photoCount: '{n} photos',
  viewerLabel: 'Review photo',
};

// "Shop by collection" on the homepage and the sub-category row on category pages. Every tile is read live from
// GET /categories (admin Categories → name, order, image; the sub-categories come from the products' own
// sub-category); only the wording lives here. A category with no admin image shows its first product's photo.
export const COLLECTIONS = {
  index: '03',
  eyebrow: 'Find your corner',
  heading: 'Shop by collection',
  // sub: 'Each corner opens into its own range, sorted by type.',
  count: ['{n} corners.', 'One for every space.'],
  viewAll: 'All products',
  viewAllHref: '/products',
  designs: { one: '{n} design', many: '{n} designs' },
  moreSubs: '+{n}',
  max: 8,
  min: 2,
  // sub-category row on /category/<slug> and /category/<slug>/<sub>
  subRow: { label: 'Browse by type', all: 'All' },
};

// "Straight from your desks": every approved review that has a customer photo, read live from GET /stats/photo-reviews
// (nothing is hand-typed or invented; with no photo reviews the section is not shown).
export const PHOTO_REVIEWS = {
  index: '05',
  eyebrow: 'Real desks',
  heading: 'Straight from your desks',
  // sub: 'Photos and words from the people who put them on their desks.',
  count: ['{n} photo reviews.', 'Straight from customers.'],
  rated: '{avg} average from {n} reviews',
  morePhotos: '+{n}',
  viewProduct: 'View product',
  photoAlt: 'Photo from {name}',
};

// Account → My profile. Every word of the page lives here; the figures (name, email, mobile, pincode) come from the user's profile.
export const ACCOUNT_PROFILE = {
  eyebrow: 'Account / Profile',
  heading: 'Your details.',
  sub: 'The name, number and pincode we use to deliver your orders.',
  cardTitle: 'Personal details',
  fields: { name: 'Full name', email: 'Email address', mobile: 'Mobile number', pincode: 'Pin code' },
  locked: 'cannot be changed',
  notSet: 'Not set',
  mobileHint: '10-digit mobile number',
  pincodeHint: '6-digit pin code',
  noName: 'Your account',
  edit: 'Edit details',
  save: 'Save changes',
  saving: 'Saving…',
  cancel: 'Cancel',
  linksLabel: 'Your account',
  links: [
    { label: 'My orders', to: '/orders' },
    { label: 'Wishlist', to: '/wishlist' },
  ],
};

// Account → My orders (list). The order data itself comes from GET orders/summaries; only the wording lives here.
export const ACCOUNT_ORDERS = {
  eyebrow: 'Account / Orders',
  heading: 'Your orders.',
  sub: 'Everything you have ordered. Open one to track it or see the full details.',
  count: { one: '{n} order', many: '{n} orders' },
  loadingLabel: 'Loading your orders',
  errorTitle: "We couldn't load your orders",
  errorBody: 'Please try again. Your orders are safe.',
  retry: 'Try again',
  emptyTitle: 'No orders yet',
  emptyBody: "When you place an order, you'll track it here.",
  browse: 'Browse products',
};

// Swipe rails on phones (gift edit, collections): the cue under the row.
export const RAIL = { swipe: 'Swipe' };
