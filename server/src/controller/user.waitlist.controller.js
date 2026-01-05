import UserWaistList from "../model/user.waitlist.model.js";
import { ApiError, ApiRes } from "../utlis/index.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const userWaitListController = async (req, res) => {
  try {
    const { userEmail } = req.body || {};

    if (!userEmail) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "Can't join the waitlist — email is required",
            null,
            false
          )
        );
    }

    const existingUser = await UserWaistList.findOne({ userEmail });

    if (existingUser) {
      return res
        .status(200)
        .json(
          new ApiRes(
            200,
            "You're already on the UrbanNook waitlist 🎉",
            userEmail,
            true
          )
        );
    }

    const joinedUser = await UserWaistList.create({ userEmail });

    if (!joinedUser) {
      return res
        .status(500)
        .json(
          new ApiError(
            500,
            "Unable to join the waitlist at the moment. Please try again later.",
            userEmail,
            false
          )
        );
    }

    /* ---------------- EMAIL ---------------- */

    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.in",
      port: 465,
      secure: true,
      auth: {
        user: process.env.ZOHO_ADMIN_EMAIL,
        pass: process.env.ZOHO_SMTP_SECRET,
      },
    });

    const sendWaitListEmail = async (to) => {
      try {
        await transporter.sendMail({
          from: "UrbanNook <urbanadmin@urbannook.in>",
          to,
          subject: "You're on the UrbanNook Waitlist 🎉",
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <h2>You're on the Waitlist 🎉</h2>
              <p>Hi there,</p>
              <p>
                Thank you for joining the <strong>UrbanNook waitlist</strong>!
                We're excited to have you with us.
              </p>
              <p>
                You'll be among the first to know when we launch and get early
                access to exclusive offers and updates.
              </p>
              <p style="margin-top: 20px;">
                Stay tuned — something exciting is coming 🚀
              </p>
              <p><strong>Team UrbanNook</strong></p>
            </div>
          `,
        });
        return true;
      } catch (err) {
        console.error("Waitlist email failed:", err.message);
        return false;
      }
    };

    const emailSent = await sendWaitListEmail(userEmail);

    if (!emailSent) {
      return res
        .status(200)
        .json(
          new ApiRes(
            200,
            "You've joined the waitlist 🎉. However, we couldn't send the confirmation email right now.",
            userEmail,
            true
          )
        );
    }

    return res
      .status(200)
      .json(
        new ApiRes(
          200,
          "🎉 Congrats! You've joined the UrbanNook waitlist. A confirmation email has been sent!",
          userEmail,
          true
        )
      );
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(new ApiError(500, "Internal Server Error", [], false));
  }
};

export default userWaitListController;
