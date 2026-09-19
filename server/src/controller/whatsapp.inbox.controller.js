import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { ApiRes } from "../utils/index.js";
import { ValidationError } from "../utils/errors.js";
import WhatsAppMessage from "../model/whatsappMessage.model.js";
import User from "../model/user.model.js";

const MAX_LIMIT = 100;

/**
 * GET /api/v1/admin/whatsapp/messages
 *
 * Inbound WhatsApp messages, newest first. The number is on the API, so these
 * cannot be read in any WhatsApp app — this endpoint is the only way to see
 * what customers have written.
 *
 * Query:
 *   kind=CUSTOMER|LOGIN_VERIFIED|LOGIN_FAILED   default: CUSTOMER
 *   handled=true|false|all                      default: false (open items)
 *   limit=1..100                                default: 50
 *   before=<ISO date>                           for paging
 */
const listMessages = asyncHandler(async (req, res) => {
  const { kind = "CUSTOMER", handled = "false", before } = req.query;
  const limit = Math.min(Number(req.query.limit) || 50, MAX_LIMIT);

  const filter = {};
  if (kind !== "all") filter.kind = kind;
  if (handled === "false") filter.handledAt = null;
  else if (handled === "true") filter.handledAt = { $ne: null };

  if (before) {
    const cutoff = new Date(before);
    if (Number.isNaN(cutoff.getTime())) {
      throw new ValidationError("`before` must be a valid date");
    }
    filter.createdAt = { $lt: cutoff };
  }

  const messages = await WhatsAppMessage.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  // Attach the customer where we know them, so the inbox can show a name
  // instead of a bare number
  const numbers = [...new Set(messages.map((m) => m.mobileNumber))];
  const users = await User.find({ mobileNumber: { $in: numbers } })
    .select("userId name email mobileNumber")
    .lean();
  const byNumber = new Map(users.map((u) => [u.mobileNumber, u]));

  const data = messages.map((m) => ({
    id: String(m._id),
    mobileNumber: m.mobileNumber,
    text: m.text,
    kind: m.kind,
    handledAt: m.handledAt,
    createdAt: m.createdAt,
    customer: byNumber.get(m.mobileNumber)
      ? {
          userId: byNumber.get(m.mobileNumber).userId,
          name: byNumber.get(m.mobileNumber).name,
          email: byNumber.get(m.mobileNumber).email,
        }
      : null,
  }));

  const unhandledCount = await WhatsAppMessage.countDocuments({
    kind: "CUSTOMER",
    handledAt: null,
  });

  return res.status(200).json(
    new ApiRes(200, "WhatsApp messages", {
      messages: data,
      unhandledCount,
      // Pass back as `before` to fetch the next page
      nextBefore: data.length === limit ? data[data.length - 1].createdAt : null,
    }, true),
  );
});

/**
 * PATCH /api/v1/admin/whatsapp/messages/:id/handled
 * Marks a message as dealt with, or reopens it with { handled: false }.
 */
const markHandled = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const handled = req.body?.handled !== false;

  const updated = await WhatsAppMessage.findByIdAndUpdate(
    id,
    { $set: { handledAt: handled ? new Date() : null } },
    { new: true },
  ).lean();

  if (!updated) throw new ValidationError("Message not found");

  return res
    .status(200)
    .json(
      new ApiRes(200, handled ? "Marked handled" : "Reopened", {
        id: String(updated._id),
        handledAt: updated.handledAt,
      }, true),
    );
});

export default { listMessages, markHandled };
