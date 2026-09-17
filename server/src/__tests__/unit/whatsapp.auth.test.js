/**
 * Integration tests: WhatsApp login via Gupshup inbound webhook
 *
 * Covers the full flow against the real Express app + in-memory Mongo:
 *   start → inbound webhook → status poll → cookies
 *
 * Plus the two things that silently break in production:
 *   - webhook secret enforcement (endpoint grants a session)
 *   - phone normalization (91-prefix vs stored 10-digit → duplicate users)
 */

import request from "supertest";

let app;
let User;
let WhatsAppLoginToken;
let normalizeIndianMobile;
let extractInboundText;

const WEBHOOK_SECRET = "test-webhook-secret-value";
const WEBHOOK_PATH = "/api/v1/webhooks/gupshup-inbound";

beforeAll(async () => {
  // Set before importing app — dotenv does not override existing vars
  process.env.GUPSHUP_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.GUPSHUP_WHATSAPP_NUMBER = "919999900000";
  process.env.USER_ACCESS_TOKEN_SECRET ||= "test-access-secret";
  process.env.REFRESH_TOKEN_SECRET ||= "test-refresh-secret";

  ({ default: app } = await import("../../app.js"));
  ({ default: User } = await import("../../model/user.model.js"));
  ({ default: WhatsAppLoginToken } = await import(
    "../../model/whatsappLoginToken.model.js"
  ));
  ({ normalizeIndianMobile, extractInboundText } = await import(
    "../../services/whatsapp.auth.service.js"
  ));
});

/** Meta format (v3) inbound text payload, as configured in Gupshup */
const metaTextPayload = (from, text) => ({
  object: "whatsapp_business_account",
  entry: [
    {
      id: "123",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "919999900000" },
            messages: [
              {
                from,
                id: "wamid.TEST",
                timestamp: "1700000000",
                type: "text",
                text: { body: text },
              },
            ],
          },
        },
      ],
    },
  ],
});

const startLogin = async () => {
  const res = await request(app).post("/api/v1/auth/whatsapp/start").expect(200);
  return res.body.data.token;
};

describe("normalizeIndianMobile", () => {
  it("strips the 91 country code Gupshup sends", () => {
    expect(normalizeIndianMobile("919876543210")).toBe(9876543210);
  });

  it("accepts a plain 10-digit number", () => {
    expect(normalizeIndianMobile("9876543210")).toBe(9876543210);
  });

  it("strips a leading zero and +91 formatting", () => {
    expect(normalizeIndianMobile("09876543210")).toBe(9876543210);
    expect(normalizeIndianMobile("+91 98765 43210")).toBe(9876543210);
  });

  it("rejects non-Indian-mobile input", () => {
    expect(normalizeIndianMobile("1234567890")).toBeNull(); // starts with 1
    expect(normalizeIndianMobile("98765")).toBeNull();
    expect(normalizeIndianMobile("")).toBeNull();
    expect(normalizeIndianMobile(null)).toBeNull();
  });
});

describe("extractInboundText", () => {
  it("parses Meta format (v3)", () => {
    expect(extractInboundText(metaTextPayload("919876543210", "UN-ABC"))).toEqual({
      phone: "919876543210",
      text: "UN-ABC",
    });
  });

  it("parses Gupshup native format", () => {
    const body = {
      type: "message",
      payload: {
        type: "text",
        sender: { phone: "919876543210" },
        payload: { text: "UN-ABC" },
      },
    };
    expect(extractInboundText(body)).toEqual({
      phone: "919876543210",
      text: "UN-ABC",
    });
  });

  it("ignores delivery-status events that share the same webhook", () => {
    const statusEvent = {
      entry: [
        {
          changes: [
            { value: { statuses: [{ id: "wamid.X", status: "delivered" }] } },
          ],
        },
      ],
    };
    expect(extractInboundText(statusEvent)).toBeNull();
  });
});

describe("GET /webhooks/gupshup-inbound", () => {
  it("returns 200 so Gupshup can verify the URL", async () => {
    await request(app).get(WEBHOOK_PATH).expect(200, "OK");
  });
});

describe("WhatsApp login flow", () => {
  it("logs a new user in end to end and sets auth cookies", async () => {
    const token = await startLogin();
    expect(token).toMatch(/^UN-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{10}$/);

    // Before the message arrives
    const pending = await request(app)
      .get("/api/v1/auth/whatsapp/status")
      .query({ token })
      .expect(200);
    expect(pending.body.data.status).toBe("PENDING");

    // Gupshup delivers the inbound message
    await request(app)
      .post(WEBHOOK_PATH)
      .query({ secret: WEBHOOK_SECRET })
      .send(metaTextPayload("919876543210", token))
      .expect(200, "EVENT_RECEIVED");

    const verified = await request(app)
      .get("/api/v1/auth/whatsapp/status")
      .query({ token })
      .expect(200);

    expect(verified.body.data.status).toBe("VERIFIED");
    expect(verified.body.data.mobileNumber).toBe(9876543210);

    const cookies = verified.headers["set-cookie"].join(";");
    expect(cookies).toContain("userAccessToken=");
    expect(cookies).toContain("userRefreshToken=");
    expect(cookies).toContain("HttpOnly");

    const user = await User.findOne({ mobileNumber: 9876543210 });
    expect(user).toBeTruthy();
    expect(user.isVerified).toBe(true);
    expect(user.userId).toBeTruthy();
    expect(user.email).toBe("9876543210@wa.urbannook.in");
  });

  it("is single-use — a second poll no longer returns a session", async () => {
    const token = await startLogin();
    await request(app)
      .post(WEBHOOK_PATH)
      .query({ secret: WEBHOOK_SECRET })
      .send(metaTextPayload("919876543210", token));

    await request(app)
      .get("/api/v1/auth/whatsapp/status")
      .query({ token })
      .expect(200);

    const replay = await request(app)
      .get("/api/v1/auth/whatsapp/status")
      .query({ token })
      .expect(200);
    expect(replay.body.data.status).toBe("EXPIRED");
  });

  it("reuses the existing account for a number already stored 10-digit", async () => {
    const existing = await User.create({
      userId: "existing-user-id",
      name: "Purana User",
      email: "purana@example.com",
      mobileNumber: 9876543210,
      isVerified: false,
      role: "USER",
    });

    const token = await startLogin();
    await request(app)
      .post(WEBHOOK_PATH)
      .query({ secret: WEBHOOK_SECRET })
      .send(metaTextPayload("919876543210", token)); // 91-prefixed

    const all = await User.find({ mobileNumber: 9876543210 });
    expect(all).toHaveLength(1); // no duplicate account
    expect(all[0].userId).toBe(existing.userId);
    expect(all[0].email).toBe("purana@example.com");
    expect(all[0].isVerified).toBe(true); // WhatsApp proved the number
  });
});

describe("webhook secret enforcement", () => {
  it("ignores a payload with no secret", async () => {
    const token = await startLogin();

    await request(app)
      .post(WEBHOOK_PATH)
      .send(metaTextPayload("919876543210", token))
      .expect(200, "EVENT_RECEIVED");

    const stored = await WhatsAppLoginToken.findOne({ token });
    expect(stored.status).toBe("PENDING");
    expect(await User.countDocuments()).toBe(0);
  });

  it("ignores a payload with a wrong secret", async () => {
    const token = await startLogin();

    await request(app)
      .post(WEBHOOK_PATH)
      .query({ secret: "not-the-secret" })
      .send(metaTextPayload("919876543210", token))
      .expect(200, "EVENT_RECEIVED");

    const stored = await WhatsAppLoginToken.findOne({ token });
    expect(stored.status).toBe("PENDING");
  });

  it("accepts the secret via header too", async () => {
    const token = await startLogin();

    await request(app)
      .post(WEBHOOK_PATH)
      .set("x-webhook-secret", WEBHOOK_SECRET)
      .send(metaTextPayload("919876543210", token))
      .expect(200, "EVENT_RECEIVED");

    const stored = await WhatsAppLoginToken.findOne({ token });
    expect(stored.status).toBe("VERIFIED");
  });
});

describe("hostile / junk inbound payloads still return 200", () => {
  it.each([
    ["unknown token", metaTextPayload("919876543210", "UN-ZZZZZZZZZZ")],
    ["plain chat message", metaTextPayload("919876543210", "hello bhai")],
    ["empty body", {}],
    ["status event", { entry: [{ changes: [{ value: { statuses: [] } }] }] }],
  ])("%s", async (_label, body) => {
    await request(app)
      .post(WEBHOOK_PATH)
      .query({ secret: WEBHOOK_SECRET })
      .send(body)
      .expect(200, "EVENT_RECEIVED");

    expect(await User.countDocuments()).toBe(0);
  });
});
