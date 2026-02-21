// src/utils/contactHelper.js

export const SUPPORT_EMAIL = "support@urbannook.in";

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