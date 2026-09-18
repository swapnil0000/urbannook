import env from "../config/envConfigSetup.js";

const GUPSHUP_SEND_URL = "https://api.gupshup.io/wa/api/v1/msg";
const GUPSHUP_TEMPLATE_URL = "https://api.gupshup.io/wa/api/v1/template/msg";

/**
 * Sends a WhatsApp message through Gupshup.
 *
 * Only for session messages — free-form replies inside the 24 hour window
 * that opens when a customer messages us. Templates (order confirmation,
 * shipping updates, cart reminders) go out on a different endpoint with an
 * approved template id, so they do not belong here.
 *
 * Never throws. Nothing here is worth failing a login or an order over.
 *
 * @param {string|number} mobileNumber 10 digit Indian number
 * @param {string} text
 * @returns {Promise<boolean>} whether Gupshup accepted it
 */
const sendWhatsAppSessionMessage = async (mobileNumber, text) => {
  const { GUPSHUP_API_KEY, GUPSHUP_APP_NAME, GUPSHUP_WHATSAPP_NUMBER } = env;

  if (!GUPSHUP_API_KEY || !GUPSHUP_APP_NAME || !GUPSHUP_WHATSAPP_NUMBER) {
    // Not configured yet — stay quiet rather than erroring on every login
    return false;
  }

  const destination = String(mobileNumber).replace(/\D/g, "");
  if (!destination) return false;

  // Gupshup expects the country code on the destination
  const to = destination.length === 10 ? `91${destination}` : destination;

  try {
    const body = new URLSearchParams({
      channel: "whatsapp",
      source: String(GUPSHUP_WHATSAPP_NUMBER).replace(/\D/g, ""),
      destination: to,
      "src.name": GUPSHUP_APP_NAME,
      message: JSON.stringify({ type: "text", text }),
    });

    const res = await fetch(GUPSHUP_SEND_URL, {
      method: "POST",
      headers: {
        apikey: GUPSHUP_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error(
        `[WHATSAPP SEND] Gupshup rejected the message (${res.status}): ${detail.slice(0, 200)}`,
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("[WHATSAPP SEND] Failed:", error.message);
    return false;
  }
};

/**
 * Sends an approved WhatsApp template through Gupshup.
 *
 * Templates are how we reach a customer outside the 24 hour session window —
 * order confirmations, shipping updates and the like. The template has to be
 * created and approved in the Gupshup dashboard first; here we only supply
 * its id and fill its variables.
 *
 * `params` must be in the same order as the {{1}}, {{2}} placeholders in the
 * approved template. Getting that order wrong does not fail loudly — it just
 * puts the wrong values in front of the customer.
 *
 * Never throws.
 *
 * @param {string|number} mobileNumber 10 digit Indian number
 * @param {string} templateId Gupshup template id
 * @param {string[]} params values for {{1}}, {{2}}, … in order
 * @returns {Promise<boolean>} whether Gupshup accepted it
 */
const sendWhatsAppTemplate = async (mobileNumber, templateId, params = []) => {
  const { GUPSHUP_API_KEY, GUPSHUP_APP_NAME, GUPSHUP_WHATSAPP_NUMBER } = env;

  if (!GUPSHUP_API_KEY || !GUPSHUP_APP_NAME || !GUPSHUP_WHATSAPP_NUMBER) {
    return false;
  }

  if (!templateId) {
    // Not configured yet — the email still goes out, so stay quiet
    return false;
  }

  const digits = String(mobileNumber).replace(/\D/g, "");
  if (!digits) return false;
  const to = digits.length === 10 ? `91${digits}` : digits;

  try {
    const body = new URLSearchParams({
      channel: "whatsapp",
      source: String(GUPSHUP_WHATSAPP_NUMBER).replace(/\D/g, ""),
      destination: to,
      "src.name": GUPSHUP_APP_NAME,
      template: JSON.stringify({
        id: templateId,
        params: params.map((v) => String(v ?? "")),
      }),
    });

    const res = await fetch(GUPSHUP_TEMPLATE_URL, {
      method: "POST",
      headers: {
        apikey: GUPSHUP_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error(
        `[WHATSAPP SEND] Template ${templateId} rejected (${res.status}): ${detail.slice(0, 200)}`,
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error(`[WHATSAPP SEND] Template ${templateId} failed:`, error.message);
    return false;
  }
};

/**
 * Order confirmation over WhatsApp.
 *
 * VARIABLE ORDER — copied from the approved `order_confirmation` template,
 * which reads:
 *
 *   Hi {{1}},
 *   Thank you very much for your purchase of {{2}} from {{3}}.
 *   ... view your order with order id {{4}} ...
 *
 *   {{1}} customer name
 *   {{2}} purchase value
 *   {{3}} store name
 *   {{4}} order id
 *
 * Getting this order wrong does not fail — it just shows the customer the
 * wrong values in the wrong places. If the template is ever edited, this is
 * the single place to update.
 */
const sendOrderConfirmationWhatsApp = async ({ mobileNumber, name, orderId, amount }) =>
  sendWhatsAppTemplate(mobileNumber, env.GUPSHUP_TEMPLATE_ORDER_CONFIRMATION, [
    name || "Customer",
    `₹${Math.round(Number(amount) || 0)}`,
    "UrbanNook",
    orderId,
  ]);

export {
  sendWhatsAppSessionMessage,
  sendWhatsAppTemplate,
  sendOrderConfirmationWhatsApp,
};
