import OTP from "../model/otp.model.js";
import bcrypt from "bcrypt";
import { sendOTP as sendOTPEmail } from "./email.service.js";
import { ValidationError, ServiceUnavailableError } from "../utils/errors.js";

class OTPService {
  /**
   * Generate and send OTP to user's email
   * @param {string} email - User's email address
   * @returns {Object} - Result object with status and message
   */
  async generateOTP(email) {
    // Check if account is locked
    const isLocked = await this.isLocked(email);
    if (isLocked) {
      throw new ServiceUnavailableError(
        "Account is temporarily locked due to too many failed attempts. Please try again later."
      );
    }

    // Generate 6-digit OTP
    const otpValue = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP before storing
    const hashedOTP = await bcrypt.hash(otpValue, 10);

    // Set expiration time (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete any existing OTP for this email
    await OTP.deleteMany({ email });

    // Store OTP in database
    await OTP.create({
      email,
      otp: hashedOTP,
      expiresAt,
      attempts: 0,
      lockedUntil: null,
    });

    // Send OTP via email using new template
    await sendOTPEmail(email, otpValue);

    return {
      statusCode: 200,
      message: `OTP sent to ${email}`,
      data: { email },
      success: true,
    };
  }

  /**
   * Verify OTP submitted by user
   * @param {string} email - User's email address
   * @param {string} otp - OTP submitted by user
   * @returns {Object} - Result object with verification status
   */
  async verifyOTP(email, otp) {
    // Check if account is locked
    const isLocked = await this.isLocked(email);
    if (isLocked) {
      throw new ServiceUnavailableError(
        "Account is temporarily locked due to too many failed attempts. Please try again later."
      );
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({ email });

    if (!otpRecord) {
      throw new ValidationError("No OTP found. Please request a new OTP.");
    }

    // Check if OTP has expired
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ email });
      throw new ValidationError("OTP has expired. Please request a new OTP.");
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, otpRecord.otp);

    if (!isValid) {
      // Increment attempt count
      otpRecord.attempts += 1;

      // Lock account after 3 failed attempts
      if (otpRecord.attempts >= 3) {
        await this.lockAccount(email, 30); // Lock for 30 minutes
        throw new ServiceUnavailableError(
          "Too many failed attempts. Account locked for 30 minutes."
        );
      }

      await otpRecord.save();

      throw new ValidationError(
        `Invalid OTP. ${3 - otpRecord.attempts} attempts remaining.`
      );
    }

    // OTP is valid - delete it to prevent reuse
    await OTP.deleteOne({ email });

    return {
      statusCode: 200,
      message: "OTP verified successfully",
      data: { email },
      success: true,
    };
  }

  /**
   * Lock account temporarily after failed attempts
   * @param {string} email - User's email address
   * @param {number} durationMinutes - Lock duration in minutes
   */
  async lockAccount(email, durationMinutes) {
    try {
      const lockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
      await OTP.updateOne({ email }, { $set: { lockedUntil } });
    } catch (error) {
      console.error(`[ERROR] Failed to lock account - Email: ${email}:`, error.message);
    }
  }

  /**
   * Check if account is currently locked
   * @param {string} email - User's email address
   * @returns {boolean} - True if locked, false otherwise
   */
  async isLocked(email) {
    try {
      const otpRecord = await OTP.findOne({ email });

      if (!otpRecord || !otpRecord.lockedUntil) {
        return false;
      }

      // Check if lock has expired
      if (new Date() > otpRecord.lockedUntil) {
        // Lock has expired, clear it
        await OTP.updateOne({ email }, { $set: { lockedUntil: null } });
        return false;
      }

      return true;
    } catch (error) {
      console.error(`[ERROR] Failed to check lock status - Email: ${email}:`, error.message);
      return false;
    }
  }
}

export default new OTPService();
