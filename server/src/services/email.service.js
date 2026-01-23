import nodemailer from "nodemailer";

let transporter = null;
const getNodeMailerTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      secure: true,
      host: "smtp.zoho.in",
      port: 465,
      auth: {
        user: process.env.ZOHO_ADMIN_EMAIL,
        pass: process.env.ZOHO_SMTP_SECRET,
      },
    });
  }
  return transporter;
};
const sendEmail = (to, subject, html) => {
  const transporter = getNodeMailerTransporter();
  try {
    transporter.sendMail({
      from: process.env.ZOHO_ADMIN_EMAIL,
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
    return {
      statusCode: 500,
      message: `Internal Server Error`,
      data: error,
      success: false,
    };
  }
};
export { sendEmail, getNodeMailerTransporter };
