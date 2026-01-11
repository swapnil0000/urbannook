import UserWaistList from "../model/user.waitlist.model.js";
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

    // if (existingUser) {
    //   return res
    //     .status(200)
    //     .json(
    //       new ApiRes(
    //         200,
    //         "You're already on the UrbanNook waitlist 🎉",
    //         { userEmail, userName },
    //         true
    //       )
    //     );
    // }

    // const joinedUser = await UserWaistList.create({
    //   userName: userName.toLowerCase(),
    //   userEmail: userEmail.toLowerCase(),
    // });
    // console.log(joinedUser);

    // if (!joinedUser) {
    //   return res
    //     .status(500)
    //     .json(
    //       new ApiError(
    //         500,
    //         "Unable to join the waitlist at the moment. Please try again later.",
    //         { userEmail, userName },
    //         false
    //       )
    //     );
    // }

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
          html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<style>
  :root { color-scheme: light only; supported-color-schemes: light; }
</style>
</head>
<body style="margin: 0; padding: 0; background-color: #2E443C; word-spacing: normal;">

  <div role="article" aria-roledescription="email" lang="en" 
       style="text-size-adjust: 100%; -webkit-text-size-adjust: 100%; background-color: #2E443C; background-image: linear-gradient(#2E443C, #2E443C); padding: 40px 20px;">
    
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="width: 100%; margin: 0; background-color: #2E443C;">
      <tr>
        <td align="center">

          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px;">
            <tr>
              <td align="center" style="padding-bottom: 30px;">
                <a href="https://urbannook.in" target="_blank">
                  <img 
                    src="https://urbannook-prod-frontend.s3.ap-south-1.amazonaws.com/Gemini_Generated_Image_vimqzcvimqzcvimq+(1).png" 
                    alt="Urban Nook" 
                    width="140" 
                    style="display: block; border: 0; max-width: 180px; filter: brightness(0) invert(1);"
                  />
                </a>
              </td>
            </tr>
          </table>

          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; background-color: #F9F9F7 !important; background-image: linear-gradient(#F9F9F7, #F9F9F7); color: #2E443C; padding: 40px; border-radius: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
            
            <tr>
              <td align="center" style="padding-bottom: 24px;">
                <h2 style="margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 300; color: #2E443C !important; letter-spacing: 1px;">
                  Welcome to the Inner Circle.
                </h2>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding-bottom: 30px;">
                <img 
                  src="https://images.unsplash.com/photo-1497215842964-222b430dc094?q=80&w=1200&auto=format&fit=crop" 
                  alt="Aesthetic Workspace" 
                  width="100%"
                  style="display: block; width: 100%; max-width: 520px; border-radius: 12px; object-fit: cover;"
                />
              </td>
            </tr>

            <tr>
              <td style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; color: #2E443C !important; text-align: left; line-height: 1.7;">
                <p style="margin: 0 0 20px 0; color: #2E443C !important;">Hi ${userName},</p>
                <p style="margin: 0 0 20px 0; color: #2E443C !important;">We’re building a collection of affordable, aesthetic essentials to elevate your workspace. We won't keep you waiting long as launch day is approaching fast.</p>
                <p style="margin: 0 0 20px 0; color: #2E443C !important;">Keep an eye on your inbox—your <strong style="color: #2E443C !important;">members-only discount code</strong> will arrive before we go live.</p>
                <p style="margin: 0 0 10px 0; color: #2E443C !important;">Until then, see what we’re building over at <strong style="color: #2E443C !important;">@urbannook</strong>.</p>
              </td>
            </tr>
          </table>

          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px;">
            <tr>
              <td style="padding-top: 30px; text-align: center;">
                <p style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #F9F9F7 !important; opacity: 0.7;">
                  Curating calm in the creative chaos.
                </p>
                <p style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0 0 10px 0; font-size: 13px;">
                  <a href="https://www.instagram.com/urbannook.store" style="color: #F9F9F7 !important; text-decoration: underline; font-weight: bold;">Instagram</a> 
                  <span style="padding: 0 10px; color: #F9F9F7 !important; opacity: 0.3;">|</span> 
                  <a href="https://urbannook.in" style="color: #F9F9F7 !important; text-decoration: underline; font-weight: bold;">Website</a>
                </p>
                <p style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 15px 0 0 0; font-size: 10px; color: #F9F9F7 !important; opacity: 0.6;">
                  © 2026 Urban Nook. All rights reserved.
                </p>
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>
  </div>
</body>
</html>
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
          "Congrats 🎉 A confirmation email is on its way to your inbox While you wait, see what we are building",
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
