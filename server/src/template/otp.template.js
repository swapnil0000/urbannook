const otpTemplate = ({ otp }) => {
  return `<!DOCTYPE html>
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

<body style="margin:0; padding:0; background-color:#2E443C;">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" 
       style="width:100%; background-color:#2E443C; padding:20px 10px;">
  <tr>
    <td align="center">

      <table width="600" cellpadding="0" cellspacing="0" role="presentation" 
             style="width:100%; max-width:600px;">

        <!-- LOGO -->
        <tr>
          <td align="center" style="padding:20px 0;">
            <h1 style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:28px; letter-spacing:1px; color:#ffffff;">
              UrbanNook
            </h1>
          </td>
        </tr>

        <!-- WHITE CARD -->
        <tr>
          <td align="center" style="padding:0;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                   style="background-color:#F9F9F7; color:#2E443C; border-radius:16px;">
              
              <!-- TITLE -->
              <tr>
                <td align="center" style="padding:30px 20px 20px 20px;">
                  <h2 style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:22px; font-weight:600; color:#2E443C;">
                    Password Reset Request
                  </h2>
                </td>
              </tr>

              <!-- CONTENT -->
              <tr>
                <td style="padding:0 30px 20px 30px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.7; color:#2E443C;">
                  <p style="margin:0 0 16px 0;">Hi there,</p>
                  <p style="margin:0 0 16px 0;">
                    We received a request to reset your password. Use the OTP code below to complete the process:
                  </p>
                </td>
              </tr>

              <!-- OTP CODE -->
              <tr>
                <td align="center" style="padding:0 30px 20px 30px;">
                  <div style="background-color:#2E443C; color:#ffffff; padding:20px 40px; border-radius:8px; display:inline-block;">
                    <span style="font-family:Arial, Helvetica, sans-serif; font-size:32px; font-weight:700; letter-spacing:8px;">
                      ${otp}
                    </span>
                  </div>
                </td>
              </tr>

              <!-- EXPIRY INFO -->
              <tr>
                <td style="padding:0 30px 20px 30px; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:1.7; color:#2E443C; text-align:center;">
                  <p style="margin:0 0 16px 0;">
                    <strong>This OTP will expire in 10 minutes.</strong>
                  </p>
                  <p style="margin:0 0 16px 0;">
                    If you didn't request this password reset, please ignore this email or contact our support team.
                  </p>
                </td>
              </tr>

              <!-- SECURITY WARNING -->
              <tr>
                <td style="padding:0 30px 30px 30px;">
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                         style="background-color:#FFF3CD; border-left:4px solid #FFC107; padding:15px; border-radius:4px;">
                    <tr>
                      <td style="font-family:Arial, Helvetica, sans-serif; font-size:13px; color:#856404;">
                        <strong>⚠️ Security Notice:</strong> Never share this OTP with anyone. UrbanNook will never ask for your OTP via phone or email.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="text-align:center; color:#ffffff; font-size:11px; padding-top:15px;">
            © 2026 Urban Nook. All rights reserved.
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>
`;
};

export default otpTemplate;
