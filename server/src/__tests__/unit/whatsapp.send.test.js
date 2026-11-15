/**
 * sendWhatsAppTemplate must report what Gupshup actually said. Gupshup answers
 * HTTP 200 even when it refuses a message, so "2xx = sent" hid failed order
 * confirmations. Only `status: "submitted"` counts as sent.
 */
let sendWhatsAppTemplate;
let sendOrderConfirmationWhatsApp;
const realFetch = global.fetch;

beforeAll(async () => {
  process.env.GUPSHUP_API_KEY = "test-key";
  process.env.GUPSHUP_APP_NAME = "testapp";
  process.env.GUPSHUP_WHATSAPP_NUMBER = "+91 99999 00000";
  process.env.GUPSHUP_TEMPLATE_ORDER_CONFIRMATION = "tpl-order";
  ({ sendWhatsAppTemplate, sendOrderConfirmationWhatsApp } = await import("../../services/whatsapp.send.service.js"));
});
afterEach(() => { global.fetch = realFetch; });

const reply = (status, body) => {
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    return { ok: status >= 200 && status < 300, status, text: async () => (typeof body === "string" ? body : JSON.stringify(body)) };
  };
  return calls;
};

describe("sendWhatsAppTemplate", () => {
  test("submitted → success with messageId", async () => {
    reply(202, { status: "submitted", messageId: "m-1" });
    await expect(sendWhatsAppTemplate("9876543210", "tpl", ["a"])).resolves.toEqual({ success: true, messageId: "m-1" });
  });

  test("HTTP 200 with an error status is a failure, with Gupshup's reason", async () => {
    reply(200, { status: "error", message: "Template Not Found" });
    const r = await sendWhatsAppTemplate("9876543210", "tpl", ["a"]);
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/Template Not Found/);
  });

  test("4xx is a failure", async () => {
    reply(401, "Authentication Failed");
    const r = await sendWhatsAppTemplate("9876543210", "tpl", []);
    expect(r).toMatchObject({ success: false });
    expect(r.error).toMatch(/HTTP 401.*Authentication Failed/);
  });

  test("not configured / no number → skipped or failed, no request", async () => {
    const calls = reply(202, { status: "submitted" });
    await expect(sendWhatsAppTemplate("9876543210", "", [])).resolves.toMatchObject({ success: false, skipped: true });
    await expect(sendWhatsAppTemplate("", "tpl", [])).resolves.toMatchObject({ success: false });
    expect(calls).toHaveLength(0);
  });

  test("network error → failure, never throws", async () => {
    global.fetch = async () => { throw new Error("ECONNRESET"); };
    await expect(sendWhatsAppTemplate("9876543210", "tpl", [])).resolves.toEqual({ success: false, error: "ECONNRESET" });
  });
});

test("order confirmation: 91-prefixed number, digits-only source, params in template order", async () => {
  const calls = reply(202, { status: "submitted", messageId: "m-2" });
  const r = await sendOrderConfirmationWhatsApp({ mobileNumber: "98765 43210", name: "Riya", orderId: "ORD1", amount: 1997.4 });
  expect(r.success).toBe(true);
  const sent = new URLSearchParams(calls[0].init.body);
  expect(sent.get("destination")).toBe("919876543210");
  expect(sent.get("source")).toBe("919999900000");
  expect(sent.get("src.name")).toBe("testapp");
  expect(JSON.parse(sent.get("template"))).toEqual({ id: "tpl-order", params: ["Riya", "₹1997", "UrbanNook", "ORD1"] });
});

test("the order model keeps the WhatsApp outcome fields (strict mode drops unknown paths silently)", async () => {
  const { default: Order } = await import("../../model/order.model.js");
  expect(Order.schema.path("orderConfirmationWa")).toBeDefined();
  expect(Order.schema.path("codConversion").schema.path("whatsappError")).toBeDefined();
});
