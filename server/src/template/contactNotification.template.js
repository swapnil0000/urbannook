import env from "../config/envConfigSetup.js";

const contactNotificationTemplate = ({ name, email, subject, message, mobile, timestamp }) => {
  const formattedDate = new Date(timestamp).toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  .bg-page { background-color:#EFEAE0; }
  .bg-card { background-color:#ffffff; }
  .bg-soft { background-color:#E5DFD3; }
  .divider { background-color:#E63329; }
  .h-text { color:#141414 !important; }
  .b-text { color:#666666 !important; }
  .m-text { color:#AAAAAA !important; }
  a[x-apple-data-detectors], .phone-link { color:#141414 !important; text-decoration:none !important; }
  @media (prefers-color-scheme: dark) {
    .bg-page { background-color:#141414 !important; }
    .bg-card { background-color:#1F1E1C !important; }
    .bg-soft { background-color:#33312D !important; }
    .divider { background-color:#C9281F !important; }
    .h-text { color:#EFEAE0 !important; }
    .b-text { color:#D8D2C5 !important; }
    .m-text { color:#8C8779 !important; }
  }
  @media only screen and (max-width:600px) {
    .pad-mobile { padding-left:24px !important; padding-right:24px !important; }
  }
</style>
</head>

<body class="bg-page" style="margin:0; padding:0; background-color:#EFEAE0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" class="bg-page"
       style="width:100%; background-color:#EFEAE0; padding:40px 20px;">
  <tr><td align="center">

    <table width="600" cellpadding="0" cellspacing="0" role="presentation" class="bg-card"
           style="width:100%; max-width:600px; background-color:#ffffff;">

      <!-- HEADER -->
      <tr>
        <td align="center" class="pad-mobile" style="padding:36px 40px 28px;">
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td class="bg-soft divider" style="background-color:#E5DFD3; border:1px solid #E63329; border-radius:20px; padding:5px 16px;">
                <span class="h-text" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:10px; font-weight:700; color:#141414; letter-spacing:2.5px; text-transform:uppercase;">
                  New Contact Submission
                </span>
              </td>
            </tr>
          </table>
          <h2 class="h-text" style="margin:20px 0 8px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:22px; font-weight:600; color:#141414; line-height:1.3; letter-spacing:-0.3px;">
            UrbanNook Contact Form
          </h2>
          <p class="m-text" style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; color:#AAAAAA;">
            Received ${formattedDate}
          </p>
        </td>
      </tr>

      <!-- SECTION DIVIDER -->
      <tr><td style="padding:0 40px;"><div class="divider" style="height:1px; background-color:#E63329;"></div></td></tr>

      <!-- DETAILS -->
      <tr>
        <td class="pad-mobile" style="padding:32px 40px 0;">
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td class="m-text" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; color:#AAAAAA; text-transform:uppercase; letter-spacing:1px; padding-bottom:16px; padding-right:20px; white-space:nowrap; vertical-align:top;">Name</td>
              <td class="h-text" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:14px; font-weight:600; color:#141414; padding-bottom:16px;">${name}</td>
            </tr>
            <tr>
              <td class="m-text" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; color:#AAAAAA; text-transform:uppercase; letter-spacing:1px; padding-bottom:16px; padding-right:20px; white-space:nowrap; vertical-align:top;">Email</td>
              <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:14px; padding-bottom:16px;">
                <a href="mailto:${email}" class="h-text" style="color:#141414; font-weight:600; text-decoration:none;">${email}</a>
              </td>
            </tr>
            <tr>
              <td class="m-text" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; color:#AAAAAA; text-transform:uppercase; letter-spacing:1px; padding-bottom:16px; padding-right:20px; white-space:nowrap; vertical-align:top;">Mobile</td>
              <td class="h-text" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:14px; font-weight:600; color:#141414; padding-bottom:16px;">
                ${mobile ? `<a href="tel:${mobile}" class="h-text phone-link" style="color:#141414 !important; text-decoration:none !important; font-weight:600;">${mobile}</a>` : '<span class="m-text" style="color:#CCCCCC; font-style:italic; font-weight:400;">Not provided</span>'}
              </td>
            </tr>
            <tr>
              <td class="m-text" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; color:#AAAAAA; text-transform:uppercase; letter-spacing:1px; padding-right:20px; white-space:nowrap; vertical-align:top;">Subject</td>
              <td style="padding-bottom:0;">
                <span style="display:inline-block; background-color:#E63329; color:#ffffff; padding:4px 12px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:12px; font-weight:600;">${subject}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- MESSAGE -->
      <tr>
        <td class="pad-mobile" style="padding:28px 40px 40px;">
          <p class="m-text" style="margin:0 0 10px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; font-weight:700; color:#AAAAAA; text-transform:uppercase; letter-spacing:3px;">
            Message
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" class="bg-soft divider" style="background-color:#E5DFD3; border:1px solid #E63329; border-radius:2px;">
            <tr>
              <td class="b-text" style="padding:20px 24px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:14px; color:#444444; line-height:1.7; white-space:pre-wrap;">${message}</td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- SECTION DIVIDER -->
      <tr><td style="padding:0 40px;"><div class="divider" style="height:1px; background-color:#E63329;"></div></td></tr>

      <!-- CTA -->
      <tr>
        <td align="center" style="padding:36px 40px 44px;">
          <a href="${env.ADMIN_DASHBOARD_URL || 'http://localhost:3000/admin'}/contacts"
             style="display:inline-block; background-color:#E63329; color:#ffffff; text-decoration:none; padding:14px 44px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:12px; font-weight:600; letter-spacing:2.5px; text-transform:uppercase;">
            View In Dashboard
          </a>
        </td>
      </tr>

      <!-- BOTTOM BAR -->
      <tr>
        <td style="background-color:#E63329; padding:20px 40px; text-align:center;">
          <p style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:10px; color:rgba(239,234,224,0.65); letter-spacing:0.5px;">
            UrbanNook Contact Form &mdash; automated notification &middot; &copy; ${new Date().getFullYear()} Urban Nook. All rights reserved.
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

export default contactNotificationTemplate;
