import axios from "axios";
import Product from "../model/product.model.js";
import ShippingQuote from "../model/shipping.quote.model.js";
import { ValidationError, NotFoundError } from "../utils/errors.js";

// How long a computed shipping quote stays valid for reuse. The checkout page computes a
// quote for display; order creation reuses the SAME quote so the charged shipping always
// equals what the user saw. 30 min comfortably covers a normal checkout session.
const QUOTE_TTL_MS = 30 * 60 * 1000;

// Price-independent signature of a shipment: pincode + per-product TOTAL quantity.
// Weight/dimensions are resolved from the DB (not the request payload), so
// (pincode, productId x quantity) fully determines the carrier rate. Keeping price out of
// the key means the display call and the charge-time recompute resolve to the SAME cached
// quote even though they feed different price sources (client price vs priceAtPurchase).
const buildQuoteSignature = (pincode, cartItems) => {
  const agg = {};
  for (const it of cartItems) {
    if (!it?.productId) continue;
    const q = parseInt(it.quant ?? it.quantity ?? 1, 10) || 1;
    agg[it.productId] = (agg[it.productId] || 0) + q;
  }
  const parts = Object.keys(agg)
    .sort()
    .map((pid) => `${pid}:${agg[pid]}`);
  // Bump the version prefix whenever the rate/selection logic changes so previously cached
  // quotes (computed under the old logic) are invalidated instead of being reused. v2: courier
  // priority changed to Delhivery-first.
  return `v2|${pincode}|${parts.join(",")}`;
};

// Reuse a fresh, previously computed quote if one exists. Never throws — a DB hiccup just
// means we recompute (original behaviour), so this can never break checkout or order creation.
const readCachedQuote = async (signature) => {
  try {
    const doc = await ShippingQuote.findOne({
      signature,
      expiresAt: { $gt: new Date() },
    }).lean();
    return doc?.quote || null;
  } catch (err) {
    console.error("ShippingQuote read failed:", err.message);
    return null;
  }
};

// Persist a successful DYNAMIC quote for reuse at charge time. Fallback (179) quotes are NOT
// cached, so a transient carrier failure never gets pinned for the whole TTL window.
const writeCachedQuote = async (signature, quote) => {
  try {
    await ShippingQuote.findOneAndUpdate(
      { signature },
      { signature, quote, expiresAt: new Date(Date.now() + QUOTE_TTL_MS) },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (err) {
    console.error("ShippingQuote write failed:", err.message);
  }
};

// Retry the aggregator on transient failures (network/timeout/429/5xx) so a momentary throttle
// or hiccup does not silently push the user onto the higher hard-coded fallback rate, which
// reads as a "price hike" on repeated calls.
const postWithRetry = async (url, body, config, { retries = 2, backoffMs = 400 } = {}) => {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await axios.post(url, body, config);
    } catch (err) {
      lastErr = err;
      const status = err.response?.status;
      const transient = !status || status === 429 || status >= 500;
      if (!transient || attempt === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, backoffMs * (attempt + 1)));
    }
  }
  throw lastErr;
};

const checkPincodeServiceability = async (deliveryPinCode) => {
  if (!deliveryPinCode) {
    throw new ValidationError("Pincode is required");
  }

  const response = await axios.post(
    `https://shipping-api.com/app/api/v1/pincode-serviceability`,
    {
      pickup_pincode: 122018,
      delivery_pincode: deliveryPinCode,
    },
    {
      headers: {
        "private-key": process.env.SHIPMOZO_PRIVATE_KEY,
        "public-key": process.env.SHIPMOZO_PUBLIC_KEY,
      },
    },
  );

  return response.data;
};

const calculateShippingRate = async ({ pincode, cartItems }) => {
  // Define fallback response
  const FALLBACK_AMOUNT = 179;
  const buildFallback = (weight = 0, boxes = 0) => ({
    total_charges: FALLBACK_AMOUNT,
    type: "standard",
    totalWeight: weight,
    expectedNoOfBoxes: boxes
  });

  if (!pincode || !cartItems || !Array.isArray(cartItems)) {
    return buildFallback();
  }

  // Quote-once-and-reuse: if we already computed a rate for this exact shipment (e.g. on the
  // checkout display call), return that stored quote so the charged amount matches what was
  // shown. Read is fail-safe; on a miss we compute fresh below.
  const quoteSignature = buildQuoteSignature(pincode, cartItems);
  const cachedQuote = await readCachedQuote(quoteSignature);
  if (cachedQuote) return cachedQuote;

  try {
    const productIds = cartItems.map((item) => item.productId);
    const dbProducts = await Product.find({ productId: { $in: productIds } })
      .select("productId weight sellingPrice dimensions ")
      .lean();

    if (dbProducts.length === 0) {
      return buildFallback();
    }

    const finalOrderItems = cartItems.map((cartItem) => {
      const productDetail = dbProducts.find(p => p.productId === cartItem.productId);
      if (!productDetail) return null;
      return {
          ...productDetail,
          price: cartItem.price,
          variant: cartItem.selectedVariant,
          quantity: cartItem.quant || cartItem.quantity
      };
    }).filter(item => item !== null);

    let totalWeight = 0;
    let totalAmount = 0;
    let totalBoxes = 0;
    const dimensions = [];
    let hasMultiQuantity = false;

    const safeFloat = (val, fallback = 0) => {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? fallback : parsed;
    };

    for (const item of finalOrderItems) {
      const quant = safeFloat(item.quantity, 1);
      if (quant > 1) hasMultiQuantity = true;
      totalBoxes += quant;

      let weightVal = 0;
      if (typeof item.weight === "string") {
        const weightStr = item.weight.toLowerCase();
        if (weightStr.includes("kg")) {
          weightVal = safeFloat(weightStr) * 1000;
        } else {
          weightVal = safeFloat(weightStr.replace(/[^0-9.]/g, ""));
        }
      } else {
        weightVal = safeFloat(item.weight);
      }

      totalWeight += weightVal * quant;
      totalAmount += safeFloat(item?.price, 0) * quant;

      const dim = item.dimensions || {};
      dimensions.push({
        no_of_box: quant.toString(),
        length: safeFloat(dim.length, 10).toString(),
        width: safeFloat(dim.breadth, 10).toString(),
        height: safeFloat(dim.height, 10).toString(),
      });
    }

    const response = await postWithRetry(
      `https://shipping-api.com/app/api/v1/rate-calculator`,
      {
        pickup_pincode: 122018,
        delivery_pincode: pincode,
        payment_type: "PREPAID",
        shipment_type: "FORWARD",
        order_amount: Math.ceil(totalAmount),
        type_of_package: "SPS",
        rov_type: "ROV_OWNER",
        weight: Math.ceil(totalWeight),
        dimensions: dimensions,
      },
      {
        timeout: 8000,
        headers: {
          "private-key": process.env.SHIPMOZO_PRIVATE_KEY,
          "public-key": process.env.SHIPMOZO_PUBLIC_KEY,
        },
      },
    );

    if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
      return buildFallback(totalWeight, totalBoxes);
    }

    const allServices = response.data.data;
    const surfaceServices = allServices.filter(el =>
      el.name.toLowerCase().includes("surface")
    );

    if (surfaceServices.length === 0) return buildFallback(totalWeight, totalBoxes);

    // Courier priority: prefer Delhivery Surface; if it is not serviceable for this pincode
    // fall back to DTDC Surface; otherwise any available surface service.
    let selectedService = surfaceServices.find(el => el.name.startsWith("Delhivery Surface"));

    if (!selectedService) {
      selectedService = surfaceServices.find(el => el.name.startsWith("DTDC Surface"));
    }

    if (!selectedService) {
      selectedService = surfaceServices[0];
    }

    if (selectedService) {
      let baseCharge = safeFloat(selectedService.total_charges);
      if (baseCharge > 0) {
        let finalCharge = Math.ceil(baseCharge);

        if (hasMultiQuantity) {
          finalCharge = Math.ceil(finalCharge * 1.25);
        }
        finalCharge += 30;

        const quote = {
          total_charges: finalCharge,
          type: "dynamic",
          totalWeight: totalWeight,
          expectedNoOfBoxes: totalBoxes,
          serviceName: selectedService.name
        };

        // Cache the successful quote so the charge-time recompute reuses this exact value.
        await writeCachedQuote(quoteSignature, quote);

        return quote;
      }
    }

    return buildFallback(totalWeight, totalBoxes);
  } catch (error) {
    console.error("Shipping Service Error:", error.response?.data || error.message);
    return buildFallback();
  }
};

export { checkPincodeServiceability, calculateShippingRate, buildQuoteSignature };
