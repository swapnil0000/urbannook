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
    console.log(joinedUser);

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
  <div style="
    margin: 0;
    padding: 0;
    background-color: #2E443C;
    color: #FFFFFF;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.7;
  ">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#2E443C; padding: 40px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; background-color:#2E443C; padding: 20px 30px;">

            <!-- Heading -->
            <tr>
              <td style="padding-bottom: 24px;">
                <h2 style="
                  margin: 0;
                  font-size: 22px;
                  font-weight: 500;
                  letter-spacing: 0.3px;
                ">
                  You’re on the Waitlist
                </h2>
              </td>
            </tr>

            <!-- Greeting -->
            <tr>
              <td style="padding-bottom: 14px;">
                <p style="margin: 0; font-size: 15px;">
                  Hi ${userName},
                </p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding-bottom: 16px;">
                <p style="margin: 0; font-size: 15px;">
                  Thank you for joining the <strong>UrbanNook</strong> waitlist. We’re glad to have you with us.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding-bottom: 16px;">
                <p style="margin: 0; font-size: 15px;">
                  As part of our early community, you’ll receive first access to new features, thoughtful updates, and curated offerings before they’re available to everyone else.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding-bottom: 24px;">
                <p style="margin: 0; font-size: 15px;">
                  We’re creating something intentional — and you’re now a part of that journey.
                </p>
              </td>
            </tr>

            <!-- GIF Section -->
            <tr>
              <td align="center" style="padding: 20px 0;">
                <img 
                  src="https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif" 
                  alt="UrbanNook Aesthetic"
                  width="100%"
                  style="max-width: 480px; border-radius: 8px; display: block;"
                />
              </td>
            </tr>

            <!-- Website Link -->
            <tr>
              <td align="center" style="padding: 10px 0 20px;">
                <a 
                  href="https://urbannook.in" 
                  target="_blank"
                  style="
                    color: #FFFFFF;
                    text-decoration: none;
                    font-size: 14px;
                    border-bottom: 1px solid rgba(255,255,255,0.4);
                    padding-bottom: 2px;
                  "
                >
                  Visit urbannook.in
                </a>
              </td>
            </tr>

            <!-- Footer / Social -->
            <tr>
              <td style="padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.2); text-align: center;">
                <p style="margin: 0 0 8px; font-size: 14px;">
                  Warm regards,<br/>
                  <strong>Team UrbanNook</strong>
                </p>

                <p style="margin: 0; font-size: 13px; opacity: 0.85;">
                  Follow our journey on Instagram
                </p>

                <p style="margin: 6px 0 0;">
                  <a 
                    href="https://www.instagram.com/urbannook.store?igsh=MW9zYWQwZzUxZmxydg==" 
                    target="_blank"
                    style="
                      color: #FFFFFF;
                      text-decoration: none;
                      font-size: 13px;
                      border-bottom: 1px solid rgba(255,255,255,0.4);
                      padding-bottom: 2px;
                    "
                  >
                    @urbannook.store
                  </a>
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
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
