const paymentReceiptTemplate = (paymentDetails) => {
  const { paymentId, amount, orderId, date, paymentMethod = 'Razorpay', codDetails } = paymentDetails;
  const isCOD = paymentMethod === 'COD';

  const formattedDate = date ? new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const amountLabel = isCOD ? 'Advance Paid' : 'Amount Paid';
  const methodLabel = isCOD ? 'Cash on Delivery (Advance via Razorpay)' : paymentMethod;

  const balanceDueRow = isCOD && codDetails?.remainingAmount > 0 ? `
      <tr>
        <td class="m-text" style="padding:14px 0 0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; color:#BBBBBB; text-transform:uppercase; letter-spacing:1px; padding-right:14px; white-space:nowrap; vertical-align:top;">Balance Due</td>
        <td style="padding:14px 0 0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; font-weight:700; color:#B45309;">&#8377;${codDetails.remainingAmount} &mdash; collected at delivery</td>
      </tr>` : '';

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
            Payment received.
          </h2>
          <p class="b-text" style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:14px; color:#666666; line-height:1.75; max-width:420px;">
            ${isCOD
              ? 'We&#8217;ve received your advance payment. The remaining balance will be collected at delivery.'
              : 'This confirms your payment has been processed successfully.'}
          </p>
        </td>
      </tr>

      <!-- AMOUNT -->
      <tr>
        <td align="center" style="padding:8px 40px 40px;">
          <p class="m-text" style="margin:0 0 6px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; font-weight:700; color:#AAAAAA; text-transform:uppercase; letter-spacing:3px;">
            ${amountLabel}
          </p>
          <p class="h-text" style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:38px; font-weight:700; color:#2E443C;">
            &#8377;${amount}
          </p>
        </td>
      </tr>

      <!-- SECTION DIVIDER -->
      <tr><td style="padding:0 40px;"><div class="divider" style="height:1px; background-color:#F5DEB3;"></div></td></tr>

      <!-- PAYMENT DETAILS -->
      <tr>
        <td class="pad-mobile" style="padding:32px 40px 40px;">
          <p class="m-text" style="margin:0 0 18px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; font-weight:700; color:#AAAAAA; text-transform:uppercase; letter-spacing:3px;">
            Payment Details
          </p>
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td class="m-text" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; color:#BBBBBB; text-transform:uppercase; letter-spacing:1px; padding-bottom:14px; padding-right:14px; white-space:nowrap; vertical-align:top;">Order ID</td>
              <td class="h-text" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; font-weight:600; color:#2E443C; padding-bottom:14px;">#${orderId}</td>
            </tr>
            <tr>
              <td class="m-text" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; color:#BBBBBB; text-transform:uppercase; letter-spacing:1px; padding-bottom:14px; padding-right:14px; white-space:nowrap; vertical-align:top;">Payment ID</td>
              <td class="h-text" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; font-weight:600; color:#2E443C; padding-bottom:14px;">${paymentId}</td>
            </tr>
            <tr>
              <td class="m-text" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; color:#BBBBBB; text-transform:uppercase; letter-spacing:1px; padding-bottom:14px; padding-right:14px; white-space:nowrap; vertical-align:top;">Method</td>
              <td class="h-text" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; font-weight:600; color:#2E443C; padding-bottom:14px;">${methodLabel}</td>
            </tr>
            <tr>
              <td class="m-text" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; color:#BBBBBB; text-transform:uppercase; letter-spacing:1px; padding-right:14px; white-space:nowrap; vertical-align:top;">Date &amp; Time</td>
              <td class="h-text" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; font-weight:600; color:#2E443C;">${formattedDate}</td>
            </tr>
            ${balanceDueRow}
          </table>
        </td>
      </tr>

      <!-- SECTION DIVIDER -->
      <tr><td style="padding:0 40px;"><div class="divider" style="height:1px; background-color:#F5DEB3;"></div></td></tr>

      <!-- CTA -->
      <tr>
        <td align="center" style="padding:36px 40px 44px;">
          <a href="https://urbannook.in/orders"
             style="display:inline-block; background-color:#2E443C; color:#ffffff; text-decoration:none; padding:14px 44px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:12px; font-weight:600; letter-spacing:2.5px; text-transform:uppercase;">
            View Order Details
          </a>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td class="bg-soft pad-mobile" style="background-color:#F7F4EF; padding:32px 40px 36px; border-top:1px solid #EEE8DC;">
          <p class="b-text" style="margin:0 0 20px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; color:#666666; line-height:1.75;">
            Keep this receipt for your records. Questions? Contact UrbanNook at
            <a href="mailto:${process.env.ZOHO_ADMIN_EMAIL}" class="h-text" style="color:#2E443C; font-weight:600; text-decoration:none;">${process.env.ZOHO_ADMIN_EMAIL}</a>.
          </p>
          <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
            <tr>
              <td style="border-top:1px solid #E8E0D5; padding-top:20px;">
                <p class="h-text" style="margin:0 0 5px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; font-weight:700; color:#2E443C; text-transform:uppercase; letter-spacing:2.5px;">
                  Seller Details
                </p>
                <p class="m-text" style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:12px; color:#888888; line-height:1.7;">
                  UrbanNook &nbsp;&middot;&nbsp;
                  <a href="mailto:${process.env.ZOHO_ADMIN_EMAIL}" class="h-text" style="color:#2E443C; text-decoration:none;">${process.env.ZOHO_ADMIN_EMAIL}</a>
                </p>
              </td>
            </tr>
          </table>
          <p class="b-text" style="margin:22px 0 0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; color:#666666; line-height:1.6;">
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

export default paymentReceiptTemplate;
