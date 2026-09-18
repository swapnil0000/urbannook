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
let describePayloadShape;

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
  ({ normalizeIndianMobile, extractInboundText, describePayloadShape } =
    await import("../../services/whatsapp.auth.service.js"));
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

describe("cache headers", () => {
  // API Cloudflare ke peeche hai jo /api/* pe max-age=7200 laga deta hai.
  // Bina no-store ke browser ko hamesha pehla PENDING cached milta hai
  // aur login kabhi complete nahi hota.
  it("marks the status response as never-cacheable", async () => {
    const token = await startLogin();

    const res = await request(app)
      .get("/api/v1/auth/whatsapp/status")
      .query({ token })
      .expect(200);

    expect(res.headers["cache-control"]).toContain("no-store");
  });

  it("marks the start response as never-cacheable", async () => {
    const res = await request(app).post("/api/v1/auth/whatsapp/start").expect(200);
    expect(res.headers["cache-control"]).toContain("no-store");
  });
});

describe("token reuse", () => {
  it("returns the same code while one is still pending", async () => {
    const first = await request(app).post("/api/v1/auth/whatsapp/start").expect(200);
    const token = first.body.data.token;

    const second = await request(app)
      .post("/api/v1/auth/whatsapp/start")
      .send({ token })
      .expect(200);

    // Same code, so the prefilled message already in WhatsApp stays valid
    expect(second.body.data.token).toBe(token);
    expect(await WhatsAppLoginToken.countDocuments()).toBe(1);
  });

  it("mints a fresh code once the old one is gone", async () => {
    const first = await request(app).post("/api/v1/auth/whatsapp/start").expect(200);
    const token = first.body.data.token;

    await WhatsAppLoginToken.deleteOne({ token });

    const second = await request(app)
      .post("/api/v1/auth/whatsapp/start")
      .send({ token })
      .expect(200);

    expect(second.body.data.token).not.toBe(token);
  });

  it("never hands back a code that is already verified", async () => {
    const first = await request(app).post("/api/v1/auth/whatsapp/start").expect(200);
    const token = first.body.data.token;

    await request(app)
      .post(WEBHOOK_PATH)
      .query({ secret: WEBHOOK_SECRET })
      .send(metaTextPayload("919876543210", token));

    const second = await request(app)
      .post("/api/v1/auth/whatsapp/start")
      .send({ token })
      .expect(200);

    expect(second.body.data.token).not.toBe(token);
  });
});

describe("describePayloadShape", () => {
  it("summarises an unknown shape without leaking phone or text", () => {
    const out = describePayloadShape({
      app: "urbannookprod",
      timestamp: 1700000000,
      type: "message",
      payload: { type: "text", sender: { phone: "919876543210" } },
    });

    expect(out).toContain("keys=[app,timestamp,type,payload]");
    expect(out).toContain("body.type=message");
    expect(out).toContain("payload.type=text");
    expect(out).not.toContain("919876543210");
  });

  it("flags a delivery-status event", () => {
    const out = describePayloadShape({
      entry: [{ changes: [{ value: { statuses: [{ status: "delivered" }] } }] }],
    });

    expect(out).toContain("statuses=1");
  });
});

describe("wa.me deep link", () => {
  it("prefills a readable sentence, not just the bare code", async () => {
    const res = await request(app).post("/api/v1/auth/whatsapp/start").expect(200);
    const { token, waLink } = res.body.data;

    expect(waLink).toContain("https://wa.me/919999900000?text=");
    const sent = decodeURIComponent(waLink.split("?text=")[1]);
    expect(sent).toBe(`Log me in to UrbanNook. Code: ${token}`);
  });

  it("still logs in when the code arrives inside a sentence", async () => {
    const token = await startLogin();

    await request(app)
      .post(WEBHOOK_PATH)
      .query({ secret: WEBHOOK_SECRET })
      .send(metaTextPayload("919876543210", `Log me in to UrbanNook. Code: ${token}`))
      .expect(200, "EVENT_RECEIVED");

    const verified = await request(app)
      .get("/api/v1/auth/whatsapp/status")
      .query({ token })
      .expect(200);
    expect(verified.body.data.status).toBe("VERIFIED");
  });

  it("tolerates lowercase and extra chatter around the code", async () => {
    const token = await startLogin();

    await request(app)
      .post(WEBHOOK_PATH)
      .query({ secret: WEBHOOK_SECRET })
      .send(metaTextPayload("919876543210", `hi ${token.toLowerCase()} thanks`))
      .expect(200, "EVENT_RECEIVED");

    const verified = await request(app)
      .get("/api/v1/auth/whatsapp/status")
      .query({ token })
      .expect(200);
    expect(verified.body.data.status).toBe("VERIFIED");
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
      name: "Existing User",
      email: "existing@example.com",
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
    expect(all[0].email).toBe("existing@example.com");
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

  it("accepts the secret in the URL path", async () => {
    const token = await startLogin();

    await request(app)
      .post(`${WEBHOOK_PATH}/${WEBHOOK_SECRET}`)
      .send(metaTextPayload("919876543210", token))
      .expect(200, "EVENT_RECEIVED");

    const stored = await WhatsAppLoginToken.findOne({ token });
    expect(stored.status).toBe("VERIFIED");
  });

  it("rejects a wrong secret in the URL path", async () => {
    const token = await startLogin();

    await request(app)
      .post(`${WEBHOOK_PATH}/definitely-not-the-secret`)
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
