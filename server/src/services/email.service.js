import nodemailer from "nodemailer";
import UserWaistList from "../model/user.waitlist.model.js";
import bulkEmailWaitlistTemplate from "../template/bulk.email.waitlist.template.js";
import env from "../config/envConfigSetup.js";
let transporter = null;

// Standard transporter for single emails
const getNodeMailerTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      secure: true,
      host: "smtp.zoho.in",
      port: 465,
      auth: {
        user: env.ZOHO_ADMIN_EMAIL,
        pass: env.ZOHO_SMTP_SECRET,
      },
    });
  }
  return transporter;
};

// Bulk email transporter with connection pooling and rate limiting
const getBulkWaitListMailerTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      secure: true,
      host: "smtp.zoho.in",
      port: 465,
      auth: {
        user: env.ZOHO_ADMIN_EMAIL,
        pass: env.ZOHO_SMTP_SECRET,
      },
      pool: true,
      maxConnections: 3,
      rateLimit: 5,
    });
  }
  return transporter;
};

// Basic email sending function
const sendEmail = (to, subject, html) => {
  const transporter = getNodeMailerTransporter();
  try {
    transporter.sendMail({
      from: env.ZOHO_ADMIN_EMAIL,
      to,
      subject,
      html,
    });
    return {
      statusCode: 200,
      message: `OTP sent to ${to}`,
      data: to,
      success: true,
    };
  } catch (error) {
    console.error('[ERROR] Email sending failed:', error.message);
    return {
      statusCode: 500,
      message: `Internal Server Error`,
      data: error,
      success: false,
    };
  }
};

// Community email service
const sendEmailCommunityService = (to, subject, html) => {
  const transporter = getNodeMailerTransporter();
  try {
    transporter.sendMail({
      from: `${env.ZOHO_ADMIN_EMAIL}`,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('[ERROR] Community email failed:', error.message);
    return {
      statusCode: 500,
      message: `Internal Server Error`,
      data: error,
      success: false,
    };
  }
};

// Enhanced email sending with retry logic
const sendEmailWithRetry = async (to, subject, html, retries = 3) => {
  const transporter = getNodeMailerTransporter();
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const info = await transporter.sendMail({
        from: `"UrbanNook" <${env.ZOHO_ADMIN_EMAIL}>`,
        to,
        subject,
        html,
      });
      
      console.log(`[INFO] Email sent successfully to ${to} (Message ID: ${info.messageId})`);
      return {
        statusCode: 200,
        message: `Email sent successfully to ${to}`,
        data: { messageId: info.messageId },
        success: true,
      };
    } catch (error) {
      console.error(`[ERROR] Email attempt ${attempt}/${retries} failed for ${to}:`, error.message);
      
      if (attempt === retries) {
        return {
          statusCode: 500,
          message: `Failed to send email after ${retries} attempts`,
          data: error.message,
          success: false,
        };
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};

// Send order confirmation email
const sendOrderConfirmation = async (userEmail, orderDetails) => {
  const { orderId, items, total, deliveryAddress } = orderDetails;
  
  // Import template dynamically
  const { default: orderConfirmationTemplate } = await import('../template/orderConfirmation.template.js');
  const html = orderConfirmationTemplate(orderDetails);
  
  return sendEmailWithRetry(
    userEmail,
    `Order Confirmation - ${orderId}`,
    html
  );
};

// Send payment receipt email
const sendPaymentReceipt = async (userEmail, paymentDetails) => {
  const { paymentId, amount, orderId, date } = paymentDetails;
  
  const { default: paymentReceiptTemplate } = await import('../template/paymentReceipt.template.js');
  const html = paymentReceiptTemplate(paymentDetails);
  
  return sendEmailWithRetry(
    userEmail,
    `Payment Receipt - ${orderId}`,
    html
  );
};

// Send OTP email
const sendOTP = async (userEmail, otp, userName = 'User') => {
  const { default: otpTemplate } = await import('../template/otp.template.js');
  const html = otpTemplate({ otp, userName });
  
  return sendEmailWithRetry(
    userEmail,
    'Your OTP for UrbanNook',
    html
  );
};

// Send welcome email
const sendWelcomeEmail = async (userEmail, userName) => {
  const { default: welcomeTemplate } = await import('../template/welcome.template.js');
  const html = welcomeTemplate({ userName });
  
  return sendEmailWithRetry(
    userEmail,
    'Welcome to UrbanNook!',
    html
  );
};

// Send order status update email
const sendOrderStatusUpdate = async (userEmail, orderDetails) => {
  const { orderId, status, trackingInfo } = orderDetails;
  
  const { default: orderStatusTemplate } = await import('../template/orderStatus.template.js');
  const html = orderStatusTemplate(orderDetails);
  
  return sendEmailWithRetry(
    userEmail,
    `Order Update - ${orderId}`,
    html
  );
};

// Bulk email service for waitlist
const sendBulkEmailWaitlistService = async () => {
  try {
    const transporter = getBulkWaitListMailerTransporter();

    // Helper function to pause execution (Rate Limiting)
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Fetch users who have NOT received the email yet
    const usersList = await UserWaistList.find(
      { waitListEmailSent: { $ne: true } },
      { userName: 1, userEmail: 1, _id: 1 }
    ).lean();

    console.log(`[INFO] Total Pending Users found: ${usersList.length}`);

    // Case 1: Database Error or Invalid Response
    if (!usersList) {
      return {
        statusCode: 500,
        message: "Failed to fetch waitlist data from database",
        data: null,
        success: false,
      };
    }

    // Case 2: No Pending Users
    if (usersList.length === 0) {
      return {
        statusCode: 200,
        message: "No pending users found. All emails have already been sent.",
        data: null,
        success: true,
      };
    }

    const BATCH_SIZE = 20;
    const WAITLIST_COUPON_CODE = env.WAITLIST_COUPON_CODE;
    const SENDER_IDENTITY = `"UrbanNook Team" <${env.ZOHO_ADMIN_EMAIL}>`;

    // Start Batch Processing
    for (let i = 0; i < usersList.length; i += BATCH_SIZE) {
      const batch = usersList.slice(i, i + BATCH_SIZE);
      console.log(
        `[INFO] Processing Batch ${i / BATCH_SIZE + 1} (${batch.length} users)...`
      );

      // Mapping users to email promises
      const emailPromises = batch.map(async (user) => {
        // Validation: Check if email or name is missing
        if (!user.userEmail || !user.userName) {
          console.log(`[WARN] Skipping invalid user data:`, user);
          return;
        }

        const htmlTemplate = bulkEmailWaitlistTemplate({
          userName: user.userName,
          WAITLIST_COUPON_CODE,
        });

        try {
          await transporter.sendMail({
            from: SENDER_IDENTITY,
            to: user.userEmail,
            subject: `Your Waitlist Access is Here, ${user.userName}!`,
            html: htmlTemplate,
          });

          // Update db only if email is sent successfully
          await UserWaistList.updateOne(
            { _id: user._id },
            { $set: { waitListEmailSent: true } }
          );
        } catch (err) {
          // If email fails, throw an error so Promise.allSettled marks it as 'rejected'
          throw new Error(
            `Failed to send to ${user.userEmail}: ${err.message}`
          );
        }
      });

      // Wait for all emails in this batch to finish
      const results = await Promise.allSettled(emailPromises);
      const failed = results.filter((r) => r.status === "rejected");

      if (failed.length > 0) {
        console.error(`[ERROR] ${failed.length} emails failed in this batch.`);
        failed.forEach((f) => console.error('[ERROR] Reason:', f.reason));
      }

      console.log(`[INFO] Batch ${i / BATCH_SIZE + 1} Completed.`);

      // Rate Limiting Delay
      if (i + BATCH_SIZE < usersList.length) {
        console.log("[INFO] Pausing for 5 seconds to respect rate limits...");
        await sleep(5000);
      }
    }

    // Close the connection after all batches are done
    transporter.close();
    console.log("[INFO] 🎉 All emails process finished!");

    return {
      statusCode: 200,
      message: "Bulk emails sent and database updated successfully",
      data: null,
      success: true,
    };
  } catch (error) {
    console.error("[ERROR] Critical Error inside Bulk Service:", error);
    return {
      statusCode: 500,
      message: "Internal Server Error processing bulk emails",
      data: error.message,
      success: false,
    };
  }
};

export {
  sendEmail,
  getNodeMailerTransporter,
  sendEmailCommunityService,
  sendOrderConfirmation,
  sendPaymentReceipt,
  sendOTP,
  sendWelcomeEmail,
  sendOrderStatusUpdate,
  sendBulkEmailWaitlistService,
};
