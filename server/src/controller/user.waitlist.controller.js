import UserWaistList from "../model/user.waitlist.model.js";
import waitlistTemplate from "../template/waitlist.template.js";
import { ApiRes } from "../utils/index.js";
import { ValidationError, AuthorizationError, InternalServerError } from "../utils/errors.js";
import nodemailer from "nodemailer";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import env from "../config/envConfigSetup.js";
const userWaitListController = asyncHandler(async (req, res) => {
  const { userName, userEmail } = req.body || {};
  
  // Validate required fields
  if (!userEmail) {
    throw new ValidationError("Can't join the waitlist — userEmail is missing");
  }
  if (!userName) {
    throw new ValidationError("Can't join the waitlist — userName is missing");
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
    throw new AuthorizationError(
      `Oops 😅 ${userName} is a VIP name reserved for the system. Please pick something uniquely *you* — we promise we won't steal it 😉`,
      { userEmail, userName }
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

  if (!joinedUser) {
    throw new InternalServerError(
      "Unable to join the waitlist at the moment. Please try again later.",
      { userEmail, userName }
    );
  }

  /* ---------------- EMAIL ---------------- */

  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.in",
    port: 465,
    secure: true,
    auth: {
      user: env.ZOHO_ADMIN_EMAIL,
      pass: env.ZOHO_SMTP_SECRET,
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
});

export default userWaitListController;
