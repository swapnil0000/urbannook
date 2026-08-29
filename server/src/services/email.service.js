import nodemailer from "nodemailer";
import env from "../config/envConfigSetup.js";
let singleTransporter = null;

// Standard transporter for single emails
const getNodeMailerTransporter = () => {
  if (!singleTransporter) {
    singleTransporter = nodemailer.createTransport({
      secure: true,
      host: "smtp.zoho.in",
      port: 465,
      auth: {
        user: env.ZOHO_ADMIN_EMAIL,
        pass: env.ZOHO_SMTP_SECRET,
      },
    });
  }
  return singleTransporter;
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

            console.log(`mail sent successfully to ${to} (Message ID: ${info.messageId})`);

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

// Send guest account created email (order confirmed + credentials)
const sendGuestAccountCreatedEmail = async (userEmail, userName, tempPassword, orderId) => {
  const { default: guestAccountCreatedTemplate } = await import('../template/guestAccountCreated.template.js');
  const html = guestAccountCreatedTemplate({ userName, email: userEmail, tempPassword, orderId });
  return sendEmailWithRetry(
    userEmail,
    `Order Confirmed & Your Urban Nook Account — #${orderId}`,
    html,
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

export {
  sendEmail,
  getNodeMailerTransporter,
  sendEmailCommunityService,
  sendOrderConfirmation,
  sendPaymentReceipt,
  sendOTP,
  sendWelcomeEmail,
  sendOrderStatusUpdate,
  sendGuestAccountCreatedEmail,
};
