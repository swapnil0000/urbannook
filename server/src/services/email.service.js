import nodemailer from "nodemailer";

const sendEmail = (to, subject, html) => {
  const zohoEmail = process.env.ZOHO_ADMIN_EMAIL;
  const zohoEmailSMTPSecret = process.env.ZOHO_SMTP_SECRET;
  const transporter = nodemailer.createTransport({
    secure: true,
    host: "smtp.zoho.in",
    port: 465,
    auth: {
      user: zohoEmail,
      pass: zohoEmailSMTPSecret,
    },
  });
  try {
    transporter.sendMail({
      from: `urbanadmin@urbannook.in`,
      to,
      subject,
      html,
    });

    return {
      statusCode: 200,
      message: `OTP sent to` - to,
      data: to,
      success: true,
    };
  } catch (error) {
    return {
      statusCode: 500,
      message: `Internal Server Error`,
      data: to,
      success: false,
    };
  }
};
export default sendEmail