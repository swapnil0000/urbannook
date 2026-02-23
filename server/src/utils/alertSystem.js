import axios from "axios";
import env from "../config/envConfigSetup.js";
/**
 * Send alert to Zoho Cliq webhook
 * Supports multiple webhook formats:
 * 1. Bot webhook: https://cliq.zoho.in/api/v2/bots/{bot_name}/incoming?zapikey={token}
 * 2. Channel webhook: https://cliq.zoho.in/api/v2/channelsbyname/{channel}/message?zapikey={token}
 * 3. Direct webhook URL (complete URL in ZOHO_WEBHOOK_TOKEN)
 *
 * @param {string} pushMsg - Alert message to send
 * @returns {Promise<{success: boolean, message: string}>}
 */
const sendAlert = async (pushMsg) => {
  try {
    // Check if webhook is configured
    if (
      !env.ZOHO_WEBHOOK_TOKEN ||
      env.ZOHO_WEBHOOK_TOKEN === "PASTE_YOUR_WEBHOOK_URL_HERE"
    ) {
      console.warn(
        "[WARN] ⚠️ ZOHO_WEBHOOK_TOKEN not configured - Alert will be logged only",
      );
      console.warn("[WARN] To enable Zoho alerts:");
      console.warn("[WARN] 1. Go to Zoho Cliq > Bots > api-red-alert");
      console.warn("[WARN] 2. Copy webhook URL");
      console.warn("[WARN] 3. Update ZOHO_WEBHOOK_TOKEN in .env file");
      console.log("[ALERT] 🚨 500 ERROR ALERT (Not sent to Zoho):");
      console.log(pushMsg);
      return {
        success: false,
        message: "Webhook not configured - logged locally",
      };
    }

    const webhookUrl = env.ZOHO_WEBHOOK_TOKEN;

    // Masking the token in logs for security
    const maskedUrl = webhookUrl.includes("zapikey=")
      ? webhookUrl.replace(/zapikey=([^&]+)/, "zapikey=***")
      : webhookUrl.substring(0, 50) + "***";

    console.log("[INFO] Sending alert to Zoho Cliq...");
    console.log("[DEBUG] Webhook URL (masked):", maskedUrl);
    console.log("[DEBUG] Message length:", pushMsg.length, "characters");

    // Send alert to Zoho Cliq
    const response = await axios.post(
      webhookUrl,
      {
        text: pushMsg,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000, // 10 second timeout
      },
    );

    console.log("[SUCCESS] ✅ Alert sent to Zoho Cliq successfully!");
    console.log("[DEBUG] Response status:", response.status);
    console.log("[DEBUG] Response data:", JSON.stringify(response.data));

    return { success: true, message: "Alert sent successfully" };
  } catch (error) {
    console.error("[ERROR] ❌ Failed to send alert to Zoho Cliq");
    console.error("[ERROR] Error type:", error.constructor.name);
    console.error("[ERROR] Error message:", error.message);

    if (error.response) {
      // Server responded with error status
      console.error("[ERROR] Response status:", error.response.status);
      console.error(
        "[ERROR] Response data:",
        JSON.stringify(error.response.data),
      );

      // Provide helpful error messages based on status code
      if (error.response.status === 400) {
        console.error("[ERROR] 🔴 Bad Request - Possible issues:");
        console.error("  1. Webhook URL format is incorrect");
        console.error("  2. Bot name or channel name is wrong");
        console.error("  3. Token (zapikey) is invalid or expired");
        console.error("  4. Message format is not supported");
        console.error(
          "[FIX] Please verify your Zoho Cliq webhook configuration:",
        );
        console.error(
          "  - Go to Zoho Cliq > Bots > Your Bot > Edit > Copy webhook URL",
        );
        console.error("  - Update ZOHO_WEBHOOK_TOKEN in .env file");
      } else if (error.response.status === 401) {
        console.error("[ERROR] 🔴 Unauthorized - Token is invalid or expired");
        console.error("[FIX] Generate a new webhook token from Zoho Cliq");
      } else if (error.response.status === 404) {
        console.error("[ERROR] 🔴 Not Found - Bot or channel does not exist");
        console.error("[FIX] Verify bot/channel name in webhook URL");
      }

      return {
        success: false,
        message: `Webhook returned ${error.response.status}: ${JSON.stringify(error.response.data)}`,
      };
    } else if (error.request) {
      // Request was made but no response received
      console.error("[ERROR] 🔴 No response from Zoho Cliq server");
      console.error("[ERROR] Possible issues:");
      console.error("  1. Network connectivity problem");
      console.error("  2. Zoho Cliq service is down");
      console.error("  3. Firewall blocking the request");
      return { success: false, message: "No response from webhook server" };
    } else {
      // Error in setting up request
      console.error("[ERROR] 🔴 Error setting up request:", error.message);
      return { success: false, message: error.message };
    }
  }
};

export default sendAlert;
