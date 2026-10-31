// src/utils/contactHelper.js

export const SUPPORT_EMAIL = "urbanadmin@urbannook.in";
// Support WhatsApp / phone (same number as the contact page), digits only for wa.me
export const SUPPORT_WHATSAPP = "919124081005";
export const SUPPORT_PHONE_DISPLAY = "+91 91240 81005";
export const SUPPORT_HOURS = "Mon–Sat, 9am – 7pm";

/**
 * Click-to-chat link that opens WhatsApp with `text` already typed to our
 * support number — the shopper only has to press send.
 */
export const getSupportWhatsAppUrl = (text = "Hi Urban Nook!") =>
    `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text)}`;

const isPhoneOrTablet = () =>
    typeof navigator !== "undefined" &&
    (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent))); // iPadOS reports as Mac

/**
 * Opens the support chat straight away, skipping WhatsApp's "Open app /
 * Continue to WhatsApp Web" page that wa.me shows in desktop browsers:
 * - phones: the WhatsApp app via whatsapp://; if nothing took over the screen
 *   after 1.5s (app not installed), falls back to the wa.me link.
 * - desktop: the chat in WhatsApp Web, message already typed.
 * Call from a click handler; keep getSupportWhatsAppUrl as the link's href so
 * it still works without JavaScript.
 */
export const openSupportWhatsApp = (text = "Hi Urban Nook!") => {
    const msg = encodeURIComponent(text);
    if (!isPhoneOrTablet()) {
        window.open(`https://web.whatsapp.com/send?phone=${SUPPORT_WHATSAPP}&text=${msg}`, "_blank", "noopener,noreferrer");
        return;
    }
    const fallback = setTimeout(() => {
        if (document.visibilityState === "visible") window.location.href = getSupportWhatsAppUrl(text);
    }, 1500);
    document.addEventListener("visibilitychange", () => clearTimeout(fallback), { once: true });
    window.location.href = `whatsapp://send?phone=${SUPPORT_WHATSAPP}&text=${msg}`;
};

/** Click handler for an <a href={getSupportWhatsAppUrl(text)}> — opens the chat directly instead. */
export const onSupportWhatsAppClick = (text) => (e) => {
    e.preventDefault();
    openSupportWhatsApp(text);
};

/**
 * Generates a properly formatted mailto URL.
 * Usage: <a href={getSupportMailUrl("Subject Here")}>Email Us</a>
 */
export const getSupportMailUrl = (subject = "Support Request") => {
    const encodedSubject = encodeURIComponent(subject);
    return `mailto:${SUPPORT_EMAIL}?subject=${encodedSubject}`;
};

/**
 * Fallback: Copies email to clipboard if mail app fails to open
 */
export const copyEmailToClipboard = async () => {
    try {
        await navigator.clipboard.writeText(SUPPORT_EMAIL);
        return true; // Success
    } catch (err) {
        console.error("Failed to copy:", err);
        return false; // Failed
    }
};