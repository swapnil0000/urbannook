import UserCommunityList from "../model/user.community.js";
import { ApiRes } from "../utils/index.js";
import { ValidationError, InternalServerError } from "../utils/errors.js";
import nodemailer from "nodemailer";
import communityTemplate from "../template/community.template.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";

const userCommunityController = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ValidationError("Can't join the community — email is missing");
  }

  const existingUser = await UserCommunityList.findOne({
    email: email.toLowerCase(),
  });

  if (existingUser) {
    return res
      .status(200)
      .json(
        new ApiRes(
          200,
          "You're already part of the UrbanNook Community 🎉",
          { email },
          true,
        ),
      );
  }

  const joinedUser = await UserCommunityList.create({
    email: email.toLowerCase(),
  });

  if (!joinedUser) {
    throw new InternalServerError(
      "Unable to join the community at the moment. Please try again later.",
      { email }
    );
  }
  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.in",
    port: 465,
    secure: true,
    auth: {
      user: process.env.ZOHO_ADMIN_EMAIL,
      pass: process.env.ZOHO_SMTP_SECRET,
    },
  });

  const sendCommunityEmail = async (to) => {
    try {
      await transporter.sendMail({
        from: "UrbanNook <urbanadmin@urbannook.in>",
        to,
        subject: "Welcome to the UrbanNook Community 🎉",
        html: communityTemplate,
      });
      const sendEmailCommunityServiceValidation =
        await sendEmailCommunityService(
          to,
          "Welcome to the UrbanNook Community 🎉",
          communityTemplate,
        );
      return true;
    } catch (err) {
      console.error("Community email failed:", err.message);
      return false;
    }
  };

  const emailSent = await sendCommunityEmail(email);

  if (!emailSent) {
    return res
      .status(200)
      .json(
        new ApiRes(
          200,
          "You've joined the community 🎉. However, we couldn't send the confirmation email right now.",
          { email },
          true,
        ),
      );
  }

  return res
    .status(200)
    .json(
      new ApiRes(
        200,
        "🎉 Congrats! You've joined the UrbanNook Community. A confirmation email has been sent!",
        { email },
        true,
      ),
    );
});

export default userCommunityController;
