import UserWaistList from "../model/user.waitlist.model.js";
import waitlistTemplate from "../template/waitlist.template.js";
import { ApiError, ApiRes } from "../utlis/index.js";
import nodemailer from "nodemailer";

const userWaitListController = async (req, res) => {
  try {
    const { userName, userEmail } = req.body || {};
    let emptyField = { userEmail, userName };
    for (let [key, value] of Object.entries(emptyField)) {
      if (!value)
        return res
          .status(400)
          .json(
            new ApiError(
              400,
              `Can't join the waitlist — ${key} is missing`,
              null,
              false,
            ),
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
            false,
          ),
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
            true,
          ),
        );
    }

    const joinedUser = await UserWaistList.create({
      userName: userName.toLowerCase(),
      userEmail: userEmail.toLowerCase(),
    });

    console.log("CREATED USER 👉", joinedUser);

    if (!joinedUser) {
      return res
        .status(500)
        .json(
          new ApiError(
            500,
            "Unable to join the waitlist at the moment. Please try again later.",
            { userEmail, userName },
            false,
          ),
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
          html: waitlistTemplate({
            userName,
            logoUrl: process?.env?.EMAIL_ASSET_LOGO,
          }),
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
            true,
          ),
        );
    }

    return res
      .status(200)
      .json(
        new ApiRes(
          200,
          "Congrats 🎉 A confirmation email is on its way to your inbox While you wait, see what we are building",
          userEmail,
          true,
        ),
      );
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(new ApiError(500, "Internal Server Error", [], false));
  }
};

export default userWaitListController;
