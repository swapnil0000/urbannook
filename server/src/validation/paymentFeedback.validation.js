import Joi from "joi";
import { PAYMENT_FEEDBACK_REASONS } from "../model/paymentFeedback.model.js";

// Contact details and amount are deliberately absent — the controller reads
// them from the Order, so a crafted payload can't attach feedback to someone
// else's name or number.
const paymentFeedbackSchema = Joi.object({
  razorpayOrderId: Joi.string().trim().pattern(/^order_[A-Za-z0-9]+$/).max(60).required()
    .messages({ "string.pattern.base": "Invalid order reference" }),
  reason: Joi.string().valid(...PAYMENT_FEEDBACK_REASONS).required()
    .messages({ "any.only": "Please pick a reason", "any.required": "Please pick a reason" }),
  comment: Joi.string().trim().max(500).optional().allow("", null),
  isInAppBrowser: Joi.boolean().optional().default(false),
});

export { paymentFeedbackSchema };
