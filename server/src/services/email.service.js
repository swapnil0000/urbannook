import nodemailer from "nodemailer";
import UserWaistList from "../model/user.waitlist.model.js";
import bulkEmailWaitlistTemplate from "../template/bulk.email.waitlist.template.js";
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

const getBulkWaitListMailerTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      secure: true,
      host: "smtp.zoho.in",
      port: 465,
      auth: {
        user: process.env.ZOHO_ADMIN_EMAIL,
        pass: process.env.ZOHO_SMTP_SECRET,
      },
      pool: true,
      maxConnections: 3,
      rateLimit: 5,
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

const sendEmailCommunityService = (to, subject, html) => {
  const transporter = getNodeMailerTransporter();
  try {
    transporter.sendMail({
      from: `${process.env.ZOHO_ADMIN_EMAIL}`,
      to,
      subject,
      html,
    });
  } catch (error) {
    return {
      statusCode: 500,
      message: `Internal Server Error`,
      data: error,
      success: false,
    };
  }
};

const sendBulkEmailWaitlistService = async () => {
  try {
    const transporter = getBulkWaitListMailerTransporter();

    // Helper function to pause execution (Rate Limiting)
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Fetch users who have NOT received the email yet
    const usersList = await UserWaistList.find(
      { waitListEmailSent: { $ne: true } },
      { userName: 1, userEmail: 1, _id: 1 },
    ).lean();

    console.log(`Total Pending Users found: ${usersList.length}`);

    // Case 1: Database Error or Invalid Response
    // If usersList is null or undefined, it means the fetch failed
    if (!usersList) {
      return {
        statusCode: 500, // Internal Server Error
        message: "Failed to fetch waitlist data from database",
        data: null,
        success: false,
      };
    }

    // Case 2: No Pending Users
    // The query was successful, but everyone has already received the email
    if (usersList.length === 0) {
      return {
        statusCode: 200, // OK - Request was successful
        message: "No pending users found. All emails have already been sent.",
        data: null,
        success: true,
      };
    }

    const BATCH_SIZE = 20;
    const WAITLIST_COUPON_CODE = process.env.WAITLIST_COUPON_CODE;
    // Construct Sender Identity for Zoho to prevent spam flagging
    const SENDER_IDENTITY = `"UrbanNook Team" <${process.env.ZOHO_ADMIN_EMAIL}>`;

    // --- Start Batch Processing ---
    for (let i = 0; i < usersList.length; i += BATCH_SIZE) {
      // Slice the array to get the current batch of users
      const batch = usersList.slice(i, i + BATCH_SIZE);
      console.log(
        `Processing Batch ${i / BATCH_SIZE + 1} (${batch.length} users)...`,
      );

      // Mapping users to email promises
      const emailPromises = batch.map(async (user) => {
        // Validation: Check if email or name is missing
        if (!user.userEmail || !user.userName) {
          console.warn("Skipping invalid user data:", user);
          return; // Skipping this iteration
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

          //  Updating db only if email is sent successfully
          // This prevents re-sending emails to users who already received one
          await UserWaistList.updateOne(
            { _id: user._id },
            { $set: { waitListEmailSent: true } },
          );
        } catch (err) {
          // If email fails, throw an error so Promise.allSettled marks it as 'rejected'
          // The DB will NOT be updated, so this user can be retried later
          throw new Error(
            `Failed to send to ${user.userEmail}: ${err.message}`,
          );
        }
      });

      // Wait for all emails in this batch to finish (whether success or failure)
      const results = await Promise.allSettled(emailPromises);
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length > 0) {
        console.error(`${failed.length} emails failed in this batch.`);
        failed.forEach((f) => console.error("Error Reason:", f.reason));
      }

      console.log(`Batch ${i / BATCH_SIZE + 1} Completed.`);

      // --- Rate Limiting Delay ---
      // Wait 5 seconds before processing the next batch to ensure safety with Zoho
      if (i + BATCH_SIZE < usersList.length) {
        console.log("Pausing for 5 seconds to respect rate limits...");
        await sleep(5000);
      }
    }

    // Close the connection after all batches are done
    transporter.close();
    console.log("🎉 All emails process finished!");

    return {
      statusCode: 200,
      message: "Bulk emails sent and database updated successfully",
      data: null,
      success: true,
    };
  } catch (error) {
    console.error("Critical Error inside Bulk Service:", error);
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
  sendBulkEmailWaitlistService,
};
