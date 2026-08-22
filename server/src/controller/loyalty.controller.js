import LoyaltyLedger from "../model/loyaltyLedger.model.js";
import { getLoyaltyConfig, getUserBalance, computeRedeemCap } from "../services/loyalty.service.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { ApiRes } from "../utils/index.js";

// GET /user/loyalty — balance + recent history, for the profile page.
export const userGetLoyalty = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const [config, balance, entries] = await Promise.all([
    getLoyaltyConfig(),
    getUserBalance(userId),
    LoyaltyLedger.find({ userId }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);

  return res.status(200).json(
    new ApiRes(200, "Loyalty summary", {
      isEnabled: config.isEnabled,
      balance,
      pointToRupeeRatio: config.pointToRupeeRatio,
      entries,
    }, true),
  );
});

// GET /user/loyalty/redeem-quote?cartValue=NNN — how many points this user
// could redeem on a cart of this size, for the checkout page to show before
// the user actually commits to an order.
export const userGetRedeemQuote = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const cartValue = Number(req.query.cartValue) || 0;

  const config = await getLoyaltyConfig();
  const balance = await getUserBalance(userId);
  const maxRedeemable = config.isEnabled ? computeRedeemCap(balance, cartValue, config) : 0;

  return res.status(200).json(
    new ApiRes(200, "Redeem quote", {
      isEnabled: config.isEnabled,
      balance,
      maxRedeemable,
      pointToRupeeRatio: config.pointToRupeeRatio,
      maxRedeemPercentOfCart: config.maxRedeemPercentOfCart,
    }, true),
  );
});
