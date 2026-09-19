import User from "../model/user.model.js";
import { isPlaceholderEmail } from "../utils/placeholderEmail.js";

/**
 * Name we generate for a WhatsApp-only account, e.g. "User 8507". Real names
 * never look like this, so it is safe to treat as a placeholder.
 */
const PLACEHOLDER_NAME = /^User \d{4}$/;

/**
 * Fills in a user's real name, email and mobile from what they typed at
 * checkout.
 *
 * WhatsApp login gives us a verified phone and nothing else, so those
 * accounts start with a placeholder email and a "User 8507" style name.
 * Checkout is the first place the customer tells us who they actually are —
 * without this, their profile, invoices and order mail keep showing the
 * placeholder forever.
 *
 * Only placeholders are overwritten. A user who already has a real email or
 * name keeps it; checkout is not allowed to quietly rewrite an identity.
 *
 * Never throws: an order must not fail because a profile update did not fit.
 *
 * @returns {Promise<{updated: string[], skipped?: string}>}
 */
const backfillUserProfileFromCheckout = async ({
  userId,
  email,
  name,
  mobile,
}) => {
  try {
    if (!userId) return { updated: [] };

    const user = await User.findOne({ userId });
    if (!user) return { updated: [] };

    const updates = {};

    const cleanEmail = typeof email === "string" ? email.toLowerCase().trim() : "";
    if (cleanEmail && cleanEmail.includes("@") && isPlaceholderEmail(user.email)) {
      // Another account may already own this address — usually the same person
      // who signed up with Google earlier. Merging the two is a separate job
      // (orders, cart, wishlist and addresses all have to move), so for now we
      // leave both alone and record it.
      const clash = await User.findOne({
        email: cleanEmail,
        userId: { $ne: userId },
      })
        .select("userId")
        .lean();

      if (clash) {
        console.warn(
          `[PROFILE BACKFILL] ${cleanEmail} already belongs to userId ${clash.userId}; leaving ${userId} on its placeholder`,
        );
        return { updated: [], skipped: "EMAIL_BELONGS_TO_ANOTHER_ACCOUNT" };
      }

      updates.email = cleanEmail;
    }

    const cleanName = typeof name === "string" ? name.trim() : "";
    if (cleanName && (!user.name || PLACEHOLDER_NAME.test(user.name))) {
      updates.name = cleanName;
    }

    const cleanMobile = String(mobile ?? "").replace(/\D/g, "").slice(-10);
    if (cleanMobile.length === 10 && !user.mobileNumber) {
      updates.mobileNumber = Number(cleanMobile);
    }

    if (Object.keys(updates).length === 0) return { updated: [] };

    await User.updateOne({ userId }, { $set: updates });

    const fields = Object.keys(updates);
    console.log(
      `[PROFILE BACKFILL] userId ${userId} filled from checkout: ${fields.join(", ")}`,
    );

    return { updated: fields };
  } catch (error) {
    // Checkout is more important than a tidy profile
    console.error("[PROFILE BACKFILL] Failed:", error.message);
    return { updated: [] };
  }
};

export { backfillUserProfileFromCheckout, PLACEHOLDER_NAME };
