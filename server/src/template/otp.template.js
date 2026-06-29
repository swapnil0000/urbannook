const otpTemplate = ({ otp }) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<style>:root { color-scheme: light only; supported-color-schemes: light; }</style>
</head>

<body style="margin:0; padding:0; background-color:#FAFAF8; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation"
       style="width:100%; background-color:#FAFAF8; padding:40px 20px;">
  <tr><td align="center">

    <table width="600" cellpadding="0" cellspacing="0" role="presentation"
           style="width:100%; max-width:600px; background-color:#ffffff;">

      <!-- HEADER -->
      <tr>
        <td align="center" style="padding:44px 40px 20px;">
          <img src="${process.env.EMAIL_ASSET_DARK_LOGO}"
               alt=""
               width="120"
               style="display:block; border:0; max-width:120px; height:auto; margin:0 auto;" />
          <div style="width:60px; height:1px; background-color:#F5DEB3; margin:14px auto 0;"></div>
        </td>
      </tr>

      <!-- HERO -->
      <tr>
        <td align="center" style="padding:44px 48px 16px;">
          <h2 style="margin:0 0 16px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:27px; font-weight:600; color:#2E443C; line-height:1.25; letter-spacing:-0.3px;">
            Password Reset Request.
          </h2>
          <p style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:14px; color:#666666; line-height:1.75; max-width:420px;">
            Hi there, we received a request to reset your password. Use the OTP code below to complete the process.
          </p>
        </td>
      </tr>

      <!-- OTP CODE -->
      <tr>
        <td align="center" style="padding:0 40px 36px;">
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="border:1px solid #F5DEB3; padding:24px 48px;">
                <p style="margin:0 0 8px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; font-weight:700; color:#AAAAAA; text-transform:uppercase; letter-spacing:3px; text-align:center;">
                  Your OTP Code
                </p>
                <p style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:36px; font-weight:700; color:#2E443C; letter-spacing:10px; text-align:center;">
                  ${otp}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- SECTION DIVIDER -->
      <tr><td style="padding:0 40px;"><div style="height:1px; background-color:#F5DEB3;"></div></td></tr>

      <!-- EXPIRY + SECURITY -->
      <tr>
        <td style="padding:32px 40px 40px;">
          <p style="margin:0 0 20px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; color:#666666; line-height:1.75;">
            <strong style="color:#2E443C;">This OTP will expire in 10 minutes.</strong><br/>
            If you didn&#8217;t request this password reset, please ignore this email or contact our support team.
          </p>

          <!-- SECURITY WARNING -->
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="border-left:3px solid #F5DEB3; padding:14px 20px; background-color:#F7F4EF;">
                <p style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:12px; color:#666666; line-height:1.7;">
                  <strong style="color:#2E443C;">Security Notice:</strong> Never share this OTP with anyone. UrbanNook will never ask for your OTP via phone or email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background-color:#F7F4EF; padding:32px 40px 36px; border-top:1px solid #EEE8DC;">
          <p style="margin:0 0 20px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; color:#666666; line-height:1.75;">
            Questions? Reach us at
            <a href="mailto:${process.env.ZOHO_ADMIN_EMAIL}" style="color:#2E443C; font-weight:600; text-decoration:none;">${process.env.ZOHO_ADMIN_EMAIL}</a>.
          </p>
          <p style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; color:#666666; line-height:1.6;">
            Warm regards,<br/>
            <strong style="color:#2E443C; letter-spacing:0.5px;">Team UrbanNook</strong>
          </p>
        </td>
      </tr>

      <!-- BOTTOM BAR -->
      <tr>
        <td style="background-color:#2E443C; padding:20px 40px; text-align:center;">
          <p style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:10px; color:rgba(245,222,179,0.65); letter-spacing:0.5px;">
            &copy; ${new Date().getFullYear()} Urban Nook. All rights reserved.
          </p>
        </td>
      </tr>

    </table>

  </td></tr>
</table>

</body>
</html>
`;
};

export default otpTemplate;
