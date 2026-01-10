import UserWaistList from "../model/user.waitlist.model.js";
import { ApiError, ApiRes } from "../utlis/index.js";
import nodemailer from "nodemailer";

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
          html: `<div style="
  margin: 0;
  padding: 0;
  background-color: #2f7f75;
  color: #1f2f2b;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.7;
">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#2f7f75; padding: 40px 0;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; background-color:#ffffff; padding: 28px 32px; border-radius: 10px;">

          <!-- Brand Header -->
          <tr>
            <td align="center" style="padding-bottom: 18px;">
              <h1 style="
                margin: 0;
                font-size: 22px;
                letter-spacing: 2px;
                color: #1f4f4a;
              ">
                URBANNOOK
              </h1>
              <p style="
                margin: 6px 0 0;
                font-size: 11px;
                letter-spacing: 2px;
                color: #7a8f8b;
                text-transform: uppercase;
              ">
                The Art of Living Well
              </p>
            </td>
          </tr>

          <!-- Hero Image -->
          <tr>
            <td align="center" style="padding: 16px 0 24px;">
              <img 
                src="https://your-cdn-link.com/hero-living-room.jpg"
                alt="UrbanNook Aesthetic Living"
                width="100%"
                style="max-width: 520px; border-radius: 8px; display: block;"
              />
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding-bottom: 12px;">
              <p style="margin: 0; font-size: 15px; color:#1f2f2b;">
                Hi ${userName},
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding-bottom: 14px;">
              <p style="margin: 0; font-size: 15px;">
                Welcome to the <strong>UrbanNook Circle</strong> — a space where thoughtfully designed home essentials meet modern living.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding-bottom: 14px;">
              <p style="margin: 0; font-size: 15px;">
                As part of our early community, you’ll get first access to curated collections, minimal interiors, and pieces that turn every house into a warm, intentional home.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding-bottom: 22px;">
              <p style="margin: 0; font-size: 15px;">
                We believe in design that feels calm, personal, and timeless — and we’re excited to have you with us.
              </p>
            </td>
          </tr>

          <!-- New Arrivals Section -->
          <tr>
            <td style="padding-bottom: 18px;">
              <h3 style="
                margin: 0 0 8px;
                font-size: 15px;
                font-weight: 600;
                color: #1f4f4a;
                text-transform: uppercase;
                letter-spacing: 1px;
              ">
                New Arrivals
              </h3>
              <p style="margin: 0; font-size: 14px; color:#5f6f6c;">
                Handpicked décor, soft textures, and aesthetic accents for modern homes.
              </p>
            </td>
          </tr>

          <!-- Image Grid -->
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding-right: 6px;">
                    <img 
                      src="https://your-cdn-link.com/product-1.jpg" 
                      alt="Decor Item"
                      width="100%"
                      style="border-radius: 6px; display:block;"
                    />
                  </td>
                  <td width="50%" style="padding-left: 6px;">
                    <img 
                      src="https://your-cdn-link.com/product-2.jpg" 
                      alt="Home Accent"
                      width="100%"
                      style="border-radius: 6px; display:block;"
                    />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 12px 0 26px;">
              <a 
                href="https://urbannook.in" 
                target="_blank"
                style="
                  background-color: #1f4f4a;
                  color: #ffffff;
                  text-decoration: none;
                  font-size: 13px;
                  letter-spacing: 1px;
                  text-transform: uppercase;
                  padding: 12px 26px;
                  border-radius: 30px;
                  display: inline-block;
                "
              >
                Explore the Collection
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 16px; border-top: 1px solid #e3e8e7; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 14px;">
                With warmth,<br/>
                <strong>Team UrbanNook</strong>
              </p>

              <p style="margin: 0; font-size: 13px; color:#6f7f7c;">
                Follow our journey on Instagram
              </p>

              <p style="margin: 6px 0 0;">
                <a 
                  href="https://www.instagram.com/urbannook.store" 
                  target="_blank"
                  style="
                    color: #1f4f4a;
                    text-decoration: none;
                    font-size: 13px;
                    border-bottom: 1px solid rgba(31,79,74,0.4);
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
