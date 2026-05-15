const guestAccountCreatedTemplate = ({ userName, email, tempPassword, orderId }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Order Confirmed & Account Created</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:#2e443c;padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:400;letter-spacing:1px;">Urban Nook</h1>
              <p style="margin:8px 0 0;color:#a89068;font-size:12px;letter-spacing:3px;text-transform:uppercase;">Order Confirmed</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;color:#2e443c;font-size:18px;">Hi ${userName},</p>
              <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
                Your order <strong style="color:#2e443c;">#${orderId}</strong> has been confirmed and is being prepared. Thank you for shopping with Urban Nook!
              </p>

              <!-- Account Created Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f6f1;border:1px solid #a89068;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 6px;color:#a89068;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;">We created an account for you</p>
                    <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.6;">
                      To help you track your order, we have automatically created an Urban Nook account. Use the credentials below to log in.
                    </p>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;">
                          <span style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Email&nbsp;&nbsp;</span>
                          <strong style="color:#2e443c;font-size:14px;">${email}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <span style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Temporary Password&nbsp;&nbsp;</span>
                          <strong style="color:#2e443c;font-size:16px;font-family:monospace;background:#eee;padding:2px 8px;border-radius:4px;">${tempPassword}</strong>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:16px 0 0;color:#a89068;font-size:12px;">
                      Please change your password after logging in for security.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <a href="https://urbannook.in" style="display:inline-block;background-color:#2e443c;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:13px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">
                      Login &amp; Track Order
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#888;font-size:13px;line-height:1.6;">
                If you did not place this order, please contact us immediately at
                <a href="mailto:support@urbannook.in" style="color:#a89068;">support@urbannook.in</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f5f7f8;padding:24px 40px;text-align:center;border-top:1px solid #eee;">
              <p style="margin:0;color:#aaa;font-size:11px;letter-spacing:1px;">
                © 2025 Urban Nook. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export default guestAccountCreatedTemplate;
