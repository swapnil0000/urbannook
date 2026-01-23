import UserCommunityList from "../model/user.community.js";
import { ApiError, ApiRes } from "../utlis/index.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import communityTemplate from "../template/community.template.js";
dotenv.config({ path: "./.env" });

const userCommunityController = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(404)
        .json(
          new ApiError(
            404,
            `Can't join the community — ${email} is missing`,
            null,
            false,
          ),
        );
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
      return res
        .status(500)
        .json(
          new ApiError(
            500,
            "Unable to join the community at the moment. Please try again later.",
            { email },
            false,
          ),
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
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(new ApiError(500, "Internal Server Error", [], false));
  }
};

export default userCommunityController;
