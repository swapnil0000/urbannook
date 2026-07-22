const bulkEmailWaitlistTemplate = ({ userName, WAITLIST_COUPON_CODE }) => {
  const name = userName || 'UrbanNook Member';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  .bg-page { background-color:#FAFAF8; }
  .bg-card { background-color:#ffffff; }
  .bg-soft { background-color:#F7F4EF; }
  .divider { background-color:#F5DEB3; }
  .h-text { color:#2E443C !important; }
  .b-text { color:#666666 !important; }
  .m-text { color:#AAAAAA !important; }
  @media (prefers-color-scheme: dark) {
    .bg-page { background-color:#12181A !important; }
    .bg-card { background-color:#1A211D !important; }
    .bg-soft { background-color:#212B24 !important; }
    .divider { background-color:#4A6155 !important; }
    .h-text { color:#F3EFE3 !important; }
    .b-text { color:#C7C2B4 !important; }
    .m-text { color:#8B9089 !important; }
  }
  @media only screen and (max-width:600px) {
    .pad-mobile { padding-left:24px !important; padding-right:24px !important; }
  }
</style>
</head>

<body class="bg-page" style="margin:0; padding:0; background-color:#FAFAF8; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" class="bg-page"
       style="width:100%; background-color:#FAFAF8; padding:40px 20px;">
  <tr><td align="center">

    <table width="600" cellpadding="0" cellspacing="0" role="presentation" class="bg-card"
           style="width:100%; max-width:600px; background-color:#ffffff;">

      <!-- HEADER -->
      <tr>
        <td align="center" style="padding:44px 40px 20px;">
          <img src="${process.env.EMAIL_ASSET_DARK_LOGO}" alt="UrbanNook" width="120"
               style="display:block; border:0; max-width:120px; height:auto; margin:0 auto;" />
          <div class="divider" style="width:60px; height:1px; background-color:#F5DEB3; margin:14px auto 0;"></div>
        </td>
      </tr>

      <!-- HERO -->
      <tr>
        <td align="center" class="pad-mobile" style="padding:44px 48px 16px;">
          <h2 class="h-text" style="margin:0 0 16px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:27px; font-weight:600; color:#2E443C; line-height:1.25; letter-spacing:-0.3px;">
            You&#8217;re in. The wait is over.
          </h2>
          <p class="b-text" style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:14px; color:#666666; line-height:1.75; max-width:420px;">
            Hi ${name}, thank you for joining our waitlist. As promised, here is your exclusive access reward.
          </p>
        </td>
      </tr>

      <!-- COUPON -->
      <tr>
        <td align="center" style="padding:8px 40px 40px;">
          <table cellpadding="0" cellspacing="0" role="presentation" class="bg-soft" style="border:1px dashed #2E443C; background-color:#F7F4EF;">
            <tr>
              <td align="center" style="padding:20px 44px;">
                <p class="m-text" style="margin:0 0 6px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; font-weight:700; color:#AAAAAA; text-transform:uppercase; letter-spacing:3px;">
                  Your Exclusive Code
                </p>
                <p class="h-text" style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:26px; font-weight:700; color:#2E443C; letter-spacing:3px;">
                  ${WAITLIST_COUPON_CODE}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- SECTION DIVIDER -->
      <tr><td style="padding:0 40px;"><div class="divider" style="height:1px; background-color:#F5DEB3;"></div></td></tr>

      <!-- CTA -->
      <tr>
        <td align="center" class="pad-mobile" style="padding:36px 40px 44px;">
          <p class="b-text" style="margin:0 0 20px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:14px; color:#666666; line-height:1.75; max-width:420px;">
            Use this code at checkout. Don&#8217;t wait &mdash; your favorite items are ready for you.
          </p>
          <a href="https://urbannook.in"
             style="display:inline-block; background-color:#2E443C; color:#ffffff; text-decoration:none; padding:14px 44px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:12px; font-weight:600; letter-spacing:2.5px; text-transform:uppercase;">
            Shop Now
          </a>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td class="bg-soft pad-mobile" style="background-color:#F7F4EF; padding:32px 40px 36px; border-top:1px solid #EEE8DC;">
          <p class="b-text" style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; color:#666666; line-height:1.6;">
            Warm regards,<br/>
            <strong class="h-text" style="color:#2E443C; letter-spacing:0.5px;">Team UrbanNook</strong>
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

export default bulkEmailWaitlistTemplate;
