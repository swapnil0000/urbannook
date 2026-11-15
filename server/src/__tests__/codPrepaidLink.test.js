import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals";
import crypto from "crypto";

// COD → prepaid: after the COD advance is paid, the balance is offered as a
// Razorpay payment link with the COD fee waived; paid in time, the order ships
// prepaid. Razorpay, email and alerts are stubbed; the order model, the webhook
// controller and the payment fulfilment are real.
process.env.COD_PREPAID_LINK_ENABLED = "true";
process.env.RP_WEBHOOK_SECRET = "whsec_test";

const links = [];
const refunds = [];
let linkError = null;
let refundError = null;
let waResult = { success: true, messageId: "m1" };
const rpLinks = {}; // what Razorpay reports for a link id
jest.unstable_mockModule("../services/rp.payement.service.js", () => ({
  razorpayCreateOrderService: async () => ({ data: { id: "order_x" } }),
  razorpayFetchOrderService: async () => null,
  razorpayFetchOrderPaymentsService: async () => [],
  razorpayCreatePaymentLinkService: async (params) => {
    if (linkError) throw linkError;
    links.push(params);
    return { id: `plink_${links.length}`, short_url: `https://rzp.io/i/l${links.length}`, ...params };
  },
  razorpayFetchPaymentLinkService: async (id) => {
    if (!rpLinks[id]) throw Object.assign(new Error("not found"), { error: { description: "not found" } });
    return rpLinks[id];
  },
  razorpayRefundPaymentService: async (paymentId, opts) => {
    if (refundError) throw refundError;
    refunds.push({ paymentId, opts });
    return { id: `rfnd_${refunds.length}` };
  },
}));
const noop = async () => ({});
jest.unstable_mockModule("../services/email.service.js", () => ({
  sendEmail: noop, getNodeMailerTransporter: () => ({}), sendEmailCommunityService: noop, sendOrderConfirmation: noop,
  sendPaymentReceipt: noop, sendOTP: noop, sendWelcomeEmail: noop, sendOrderStatusUpdate: noop, sendGuestAccountCreatedEmail: noop,
}));
jest.unstable_mockModule("html-pdf-node", () => ({ default: { generatePdf: async () => Buffer.from("") } }));
jest.unstable_mockModule("../utils/s3.utils.js", () => ({
  uploadInvoiceToS3: async () => "invoices/test.pdf", uploadReviewImageToS3: async () => "", getInvoicePresignedUrl: async () => "", uploadCustomizationImageToS3: async () => "",
}));
const whatsapps = [];
jest.unstable_mockModule("../services/whatsapp.send.service.js", () => ({
  sendWhatsAppSessionMessage: async () => true,
  sendWhatsAppTemplate: async () => true,
  sendOrderConfirmationWhatsApp: async () => true,
  sendCodPayLinkWhatsApp: async (args) => { whatsapps.push(args); return waResult; },
}));
const alerts = [];
jest.unstable_mockModule("../utils/alertSystem.js", () => ({ default: async (msg) => { alerts.push(msg); return { success: true }; } }));

let Order, svc, razorpayWebHookController, getOrderStatus;

const ORDER = (over = {}) => ({
  orderId: "0192f0aa-1111-7aaa-8bbb-123456789abc",
  userId: "u1",
  userName: "Aarav",
  userEmail: "aarav@example.com",
  userMobile: "9876543210",
  status: "PAID",
  paymentMethod: "COD",
  amount: 1798,
  codDetails: { partialAmountPaid: 298, remainingAmount: 1500, codFee: 49 },
  codConversion: { status: "pending", requestedAt: new Date() },
  items: [],
  statusHistory: [],
  payment: { razorpayOrderId: "order_adv_1" },
  ...over,
});
const seed = async (over) => { const doc = ORDER(over); await Order.collection.insertOne(doc); return Order.findOne({ orderId: doc.orderId }).lean(); };
const get = () => Order.findOne({ orderId: ORDER().orderId }).lean();
const linkPaid = (link, payment) => ({ link: { id: link, status: "paid", notes: { purpose: "cod_to_prepaid" } }, payment: { id: "pay_bal", amount: 145100, ...payment } });

const webhook = (event, payload) => new Promise((resolve) => {
  const body = Buffer.from(JSON.stringify({ event, payload }));
  const signature = crypto.createHmac("sha256", "whsec_test").update(body).digest("hex");
  const res = { code: 0 };
  res.status = (c) => { res.code = c; return res; };
  res.json = (p) => { res.body = p; resolve(res); return res; };
  razorpayWebHookController({ headers: { "x-razorpay-signature": signature }, body }, res);
});

beforeAll(async () => {
  ({ default: Order } = await import("../model/order.model.js"));
  svc = await import("../services/codPrepaidLink.service.js");
  ({ razorpayWebHookController } = await import("../controller/rp.payment.controller.js"));
  ({ getOrderStatus } = await import("../controller/user.cart.controller.js"));
});
beforeEach(() => { for (const k of Object.keys(rpLinks)) delete rpLinks[k]; whatsapps.length = 0; links.length = 0; refunds.length = 0; alerts.length = 0; linkError = null; refundError = null; waResult = { success: true, messageId: "m1" }; process.env.COD_PREPAID_LINK_ENABLED = "true"; });

describe("which orders get a link", () => {
  const base = { paymentMethod: "COD", codDetails: { remainingAmount: 1500, codFee: 49 } };
  it("a paid COD order: pending, and the link would charge the balance minus the fee", () => {
    expect(svc.codLinkPendingFields(base).codConversion.status).toBe("pending");
    expect(svc.codLinkAmount(base)).toBe(1451);
  });
  it.each([
    ["prepaid", { ...base, paymentMethod: "PREPAID" }],
    ["Magic", { ...base, isMagicOrder: true }],
    ["internal test", { ...base, isInternalTestOrder: true }],
    ["nothing left after the fee", { paymentMethod: "COD", codDetails: { remainingAmount: 49, codFee: 49 } }],
    ["already has one", { ...base, codConversion: { status: "sent" } }],
  ])("%s: none", (_l, order) => expect(svc.codLinkPendingFields(order)).toEqual({}));
  it("switched off with COD_PREPAID_LINK_ENABLED=false: none", () => {
    process.env.COD_PREPAID_LINK_ENABLED = "false";
    expect(svc.codLinkPendingFields(base)).toEqual({});
  });
  it("on by default: no setting needed", () => {
    delete process.env.COD_PREPAID_LINK_ENABLED;
    expect(svc.codLinkPendingFields(base).codConversion.status).toBe("pending");
  });
});

describe("offering the link", () => {
  it("creates one Razorpay link for the balance minus the COD fee, sent by SMS and email, open 2 hours", async () => {
    const order = await seed();
    const now = new Date("2026-11-16T06:00:00Z");
    await svc.offerCodPrepaidLink(order, now);
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      amount: 145100, accept_partial: false, expire_by: Math.floor(now.getTime() / 1000) + 7200,
      reference_id: `${ORDER().orderId}-cod`, notify: { sms: true, email: true },
      customer: { contact: "+919876543210", email: "aarav@example.com" }, notes: { purpose: "cod_to_prepaid" },
    });
    expect((await get()).codConversion).toMatchObject({ status: "sent", linkId: "plink_1", shortUrl: "https://rzp.io/i/l1", amount: 1451, feeWaived: 49, whatsappSent: true });
    expect(whatsapps).toEqual([{ mobileNumber: "9876543210", name: "Aarav", amount: 1451, feeWaived: 49, url: "https://rzp.io/i/l1" }]);
    await svc.offerCodPrepaidLink(order, now); // the webhook and the status poll can both get here
    expect(links).toHaveLength(1);
  });

  it("a WhatsApp Gupshup did not accept is recorded as not sent, with the reason", async () => {
    // sendWhatsAppTemplate returns an object; `!!sent` used to record this as sent.
    waResult = { success: false, skipped: true, error: "Template id not configured" };
    await svc.offerCodPrepaidLink(await seed());
    expect((await get()).codConversion).toMatchObject({ status: "sent", whatsappSent: false, whatsappError: "Template id not configured" });
  });

  it("a placeholder (WhatsApp-login) email is not given to Razorpay", async () => {
    await svc.offerCodPrepaidLink(await seed({ userEmail: "9876543210@wa.urbannook.in" }));
    expect(links[0].customer.email).toBeUndefined();
    expect(links[0].notify).toEqual({ sms: true, email: false });
  });

  it("Razorpay refuses: marked failed, the order stays an ordinary COD order", async () => {
    linkError = Object.assign(new Error("bad"), { error: { description: "payment link disabled" } });
    expect(await svc.offerCodPrepaidLink(await seed())).toBeNull();
    const o = await get();
    expect(o.codConversion).toMatchObject({ status: "failed", error: "payment link disabled" });
    expect(o.paymentMethod).toBe("COD");
  });
});

describe("the link is paid", () => {
  beforeEach(async () => { await svc.offerCodPrepaidLink(await seed()); });

  it("the order becomes prepaid: nothing to collect, COD fee off the total", async () => {
    expect(await svc.applyCodLinkPaid(linkPaid("plink_1"))).toEqual({ converted: true });
    const o = await get();
    expect(o).toMatchObject({ paymentMethod: "PREPAID", amount: 1749, codDetails: { remainingAmount: 0, codFee: 0, partialAmountPaid: 298 } });
    expect(o.codConversion).toMatchObject({ status: "paid", paymentId: "pay_bal" });
    expect(o.statusHistory.at(-1).note).toContain("COD fee waived");
    expect(await svc.applyCodLinkPaid(linkPaid("plink_1"))).toEqual({ already: "paid" }); // webhook redelivery
    expect(refunds).toHaveLength(0);
  });

  it("already handed to the courier as COD: the link payment is refunded, the order stays COD", async () => {
    await Order.collection.updateOne({ orderId: ORDER().orderId }, { $set: { isPushedToShipmozo: true } });
    expect(await svc.applyCodLinkPaid(linkPaid("plink_1"))).toMatchObject({ refunded: true });
    expect(refunds[0].paymentId).toBe("pay_bal");
    const o = await get();
    expect(o.paymentMethod).toBe("COD");
    expect(o.codConversion).toMatchObject({ status: "refunded", refundId: "rfnd_1" });
  });

  it("wrong amount: refunded, not converted", async () => {
    expect(await svc.applyCodLinkPaid(linkPaid("plink_1", { amount: 100 }))).toMatchObject({ refunded: true });
    expect((await get()).paymentMethod).toBe("COD");
  });

  it("refund fails: flagged and an alert goes to the team", async () => {
    await Order.collection.updateOne({ orderId: ORDER().orderId }, { $set: { status: "CANCELLED" } });
    refundError = new Error("refund window closed");
    expect(await svc.applyCodLinkPaid(linkPaid("plink_1"))).toMatchObject({ refunded: false });
    expect((await get()).codConversion.status).toBe("refund_failed");
    expect(alerts[0]).toContain("pay_bal");
  });

  it("other payment links are none of our business", async () => {
    expect(await svc.applyCodLinkPaid({ link: { id: "plink_x", notes: {} }, payment: { id: "p" } })).toEqual({ ignored: "not_ours" });
  });

  it("expired unpaid: the order stays COD", async () => {
    await svc.markCodLinkClosed({ link: { id: "plink_1", notes: { purpose: "cod_to_prepaid" } }, status: "expired" });
    expect((await get()).codConversion.status).toBe("expired");
  });
});

describe("end to end through the Razorpay webhook", () => {
  it("advance captured → link offered → link paid → prepaid", async () => {
    await seed({ status: "CREATED", codConversion: undefined, userEmail: "9876543210@wa.urbannook.in" });
    const r1 = await webhook("payment.captured", { payment: { entity: { id: "pay_adv", order_id: "order_adv_1", amount: 29800, status: "captured", method: "upi" } } });
    expect(r1.code).toBe(200);
    let o = await get();
    expect(o.status).toBe("PAID");
    expect(o.codConversion).toMatchObject({ status: "sent", amount: 1451, feeWaived: 49 });
    expect(links).toHaveLength(1);

    const r2 = await webhook("payment_link.paid", {
      payment_link: { entity: { id: o.codConversion.linkId, status: "paid", amount_paid: 145100, notes: { purpose: "cod_to_prepaid", orderId: o.orderId } } },
      payment: { entity: { id: "pay_bal", amount: 145100, status: "captured" } },
    });
    expect(r2.code).toBe(200);
    o = await get();
    expect(o).toMatchObject({ paymentMethod: "PREPAID", amount: 1749, codDetails: { remainingAmount: 0 } });
  });

  it("switched off: a paid COD order gets no link and stays as before", async () => {
    process.env.COD_PREPAID_LINK_ENABLED = "false";
    await seed({ status: "CREATED", codConversion: undefined });
    await webhook("payment.captured", { payment: { entity: { id: "pay_adv", order_id: "order_adv_1", amount: 29800, status: "captured" } } });
    const o = await get();
    expect(o.status).toBe("PAID");
    expect(o.codConversion).toBeFalsy();
    expect(links).toHaveLength(0);
  });
});

describe("guest confirmation screen (order-status poll)", () => {
  const status = () => new Promise((resolve, reject) => {
    const res = { status: () => res, json: (p) => { resolve(p.data); return res; } };
    getOrderStatus({ params: { orderId: "order_adv_1" } }, res, reject);
  });

  it("a paid guest COD order with an open link carries the offer", async () => {
    await svc.offerCodPrepaidLink(await seed({ isGuestOrder: true }));
    const d = await status();
    expect(d.status).toBe("PAID");
    expect(d.payOnlineOffer).toMatchObject({ url: "https://rzp.io/i/l1", amount: 1451, feeWaived: 49 });
  });

  it("no link (or prepaid): no offer", async () => {
    await seed({ isGuestOrder: true, codConversion: { status: "failed" } });
    expect((await status()).payOnlineOffer).toBeNull();
  });
});

describe("reconcile cron: Razorpay asked directly (no webhook needed)", () => {
  const plinkPaid = (id, over = {}) => ({ id, status: "paid", notes: { purpose: "cod_to_prepaid" }, payments: [{ payment_id: "pay_bal", amount: 145100, status: "captured" }], ...over });

  it("a link Razorpay reports paid is applied: the order becomes prepaid", async () => {
    await svc.offerCodPrepaidLink(await seed());
    rpLinks.plink_1 = plinkPaid("plink_1");
    expect(await svc.reconcileCodPrepaidLinks()).toMatchObject({ checked: 1, converted: 1 });
    expect(await get()).toMatchObject({ paymentMethod: "PREPAID", amount: 1749 });
    expect(await svc.reconcileCodPrepaidLinks()).toMatchObject({ checked: 0 }); // nothing left open
  });

  it("webhook and cron on the same payment: the one that loses the race does not refund", async () => {
    await svc.offerCodPrepaidLink(await seed());
    // The other path converts the order between this one's read and its write.
    const spy = jest.spyOn(Order, "findOneAndUpdate").mockImplementationOnce(async () => {
      await Order.collection.updateOne(
        { orderId: ORDER().orderId },
        { $set: { paymentMethod: "PREPAID", "codConversion.status": "paid", "codConversion.paymentId": "pay_bal" } },
      );
      return null;
    });
    expect(await svc.applyCodLinkPaid(linkPaid("plink_1"))).toEqual({ already: "paid" });
    spy.mockRestore();
    expect(refunds).toHaveLength(0);
    expect((await get()).paymentMethod).toBe("PREPAID");
  });

  it("an expired link is closed; an unpaid open link is left alone", async () => {
    await svc.offerCodPrepaidLink(await seed());
    rpLinks.plink_1 = { id: "plink_1", status: "created", notes: { purpose: "cod_to_prepaid" }, payments: [] };
    expect(await svc.reconcileCodPrepaidLinks()).toMatchObject({ checked: 1, converted: 0, closed: 0 });
    rpLinks.plink_1.status = "expired";
    await svc.reconcileCodPrepaidLinks();
    expect((await get()).codConversion.status).toBe("expired");
  });

  it("creation interrupted by a restart: a stale pending link is created now", async () => {
    await seed({ codConversion: { status: "pending", requestedAt: new Date(Date.now() - 5 * 60 * 1000) } });
    expect(await svc.reconcileCodPrepaidLinks()).toMatchObject({ retried: 1 });
    expect((await get()).codConversion.status).toBe("sent");
  });

  it("stuck creating for 10+ minutes: given up, ordinary COD", async () => {
    await seed({ codConversion: { status: "creating", requestedAt: new Date(Date.now() - 11 * 60 * 1000) } });
    expect(await svc.reconcileCodPrepaidLinks()).toMatchObject({ failed: 1 });
    expect((await get()).codConversion.status).toBe("failed");
  });
});
