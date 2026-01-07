import UserWaistList from "../model/user.waitlist.model.js";
import { ApiError, ApiRes } from "../utlis/index.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const userWaitListController = async (req, res) => {
  try {
    const { userName, userEmail } = req.body || {};
    let emptyField = {};
    userEmail == undefined
      ? (emptyField.userEmail = true)
      : (emptyField.userEmail = false);
    userName == undefined
      ? (emptyField.userName = true)
      : (emptyField.userName = false);
    const missingKey = ((emptyField) => {
      for (let key in emptyField) {
        if (emptyField.hasOwnProperty(key) && emptyField[key]) {
          return key;
        }
      }
    })(emptyField);

    if (
      Object.keys(emptyField).length > 0 &&
      (emptyField?.userEmail || emptyField?.userName)
    ) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            `Can't join the waitlist — ${missingKey} is missing`,
            null,
            false
          )
        );
    }
    const reservedNames = [
      "admin",
      "root",
      "support",
      "system",
      "owner",
      "urbannook",
      "superuser",
    ];

    if (reservedNames.includes(userName.toLowerCase())) {
      return res
        .status(403)
        .json(
          new ApiError(
            403,
            `Oops 😅 ${userName} is a VIP name reserved for the system. Please pick something uniquely *you* — we promise we won’t steal it 😉`,
            { userEmail, userName },
            false
          )
        );
    }

    const existingUser = await UserWaistList.findOne({
      userEmail: userEmail.toLowerCase(),
    });

    if (existingUser) {
      return res
        .status(200)
        .json(
          new ApiRes(
            200,
            "You're already on the UrbanNook waitlist 🎉",
            { userEmail, userName },
            true
          )
        );
    }

    const joinedUser = await UserWaistList.create({
      userName: userName.toLowerCase(),
      userEmail: userEmail.toLowerCase(),
    });

    if (!joinedUser) {
      return res
        .status(500)
        .json(
          new ApiError(
            500,
            "Unable to join the waitlist at the moment. Please try again later.",
            { userEmail, userName },
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
            <h2>You're on the Waitlist ✨</h2>
            <p>Hi ${userName},</p>
            <p>
              Thanks for signing up for the <strong>UrbanNook waitlist</strong>. We're genuinely excited to have you with us.
            </p>
            <p>
              As a waitlist member, you’ll get early access to new features, special offers, and updates before anyone else.
            </p>
            <p style="margin-top: 20px;">
              We’re building something thoughtfully crafted—and you’re now part of that journey.
            </p>
            <p>
              Warm regards,<br/>
              <strong>Team UrbanNook</strong>
            </p>
          </div>`,
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
