const welcomeTemplate = ({ userName }) => {
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
            Welcome to UrbanNook.
          </h2>
          <p style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:14px; color:#666666; line-height:1.75; max-width:420px;">
            Hi <strong style="color:#2E443C;">${userName}</strong>, we&#8217;re thrilled to have you as part of our community. A warm, aesthetic space awaits you.
          </p>
        </td>
      </tr>

      <!-- CTA -->
      <tr>
        <td align="center" style="padding:28px 40px 44px;">
          <a href="https://urbannook.in/shop"
             style="display:inline-block; background-color:#2E443C; color:#ffffff; text-decoration:none; padding:14px 44px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:12px; font-weight:600; letter-spacing:2.5px; text-transform:uppercase;">
            Start Shopping
          </a>
        </td>
      </tr>

      <!-- SECTION DIVIDER -->
      <tr><td style="padding:0 40px;"><div style="height:1px; background-color:#F5DEB3;"></div></td></tr>

      <!-- WHAT'S NEXT -->
      <tr>
        <td style="padding:32px 40px 8px;">
          <p style="margin:0 0 18px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; font-weight:700; color:#2E443C; text-transform:uppercase; letter-spacing:3px;">
            What&#8217;s Next
          </p>
          <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
            <tr>
              <td style="padding:0 0 14px;">
                <table cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td style="width:6px; height:6px; background-color:#F5DEB3; vertical-align:top; padding-top:5px; padding-right:14px;"></td>
                    <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; color:#444444; line-height:1.7;">Browse our collection of aesthetic products</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 14px;">
                <table cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td style="width:6px; height:6px; background-color:#F5DEB3; vertical-align:top; padding-top:5px; padding-right:14px;"></td>
                    <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; color:#444444; line-height:1.7;">Add items to your wishlist</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 14px;">
                <table cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td style="width:6px; height:6px; background-color:#F5DEB3; vertical-align:top; padding-top:5px; padding-right:14px;"></td>
                    <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; color:#444444; line-height:1.7;">Enjoy a seamless shopping experience</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- SECTION DIVIDER -->
      <tr><td style="padding:20px 40px 0;"><div style="height:1px; background-color:#F5DEB3;"></div></td></tr>

      <!-- FOOTER -->
      <tr>
        <td style="background-color:#F7F4EF; padding:32px 40px 36px; border-top:1px solid #EEE8DC;">
          <p style="margin:0 0 20px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; color:#666666; line-height:1.75;">
            If you have any questions, our support team is always here to help at
            <a href="mailto:${process.env.ZOHO_ADMIN_EMAIL}" style="color:#2E443C; font-weight:600; text-decoration:none;">${process.env.ZOHO_ADMIN_EMAIL}</a>.
          </p>
          <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
            <tr>
              <td style="border-top:1px solid #E8E0D5; padding-top:20px;">
                <p style="margin:0 0 5px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; font-weight:700; color:#2E443C; text-transform:uppercase; letter-spacing:2.5px;">
                  Stay Connected
                </p>
                <p style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:12px; color:#888888; line-height:1.7;">
                  <a href="https://www.instagram.com/urbannook.store" target="_blank" style="color:#2E443C; text-decoration:none; font-weight:600;">@urbannook.store</a>
                  &nbsp;&middot;&nbsp;
                  <a href="https://urbannook.in" target="_blank" style="color:#2E443C; text-decoration:none;">urbannook.in</a>
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:22px 0 0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; color:#666666; line-height:1.6;">
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

export default welcomeTemplate;
