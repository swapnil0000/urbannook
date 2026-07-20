const orderConfirmationTemplate = (orderDetails) => {
  const { orderId, items = [], total, deliveryAddress, orderDate, senderMobile, receiverMobile, paymentMethod, codDetails } = orderDetails;
  const isCOD = paymentMethod === 'COD';

  const itemsHtml = items.map(item => `
    <tr>
      <td class="h-text" style="padding:14px 0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; color:#333333; border-bottom:1px solid #F5ECD0; line-height:1.4;">
        ${item.productName || item.name}
        ${(item.variant || item.color) && (item.variant !== 'N/A' || item.color !== 'N/A') ? `<br/><span class="m-text" style="font-size:11px; color:#888888;">Variant: ${item.variant || item.color}</span>` : ''}
      </td>
      <td class="b-text" style="padding:14px 0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; color:#777777; text-align:center; border-bottom:1px solid #F5ECD0;">
        ${item.quantity}
      </td>
      <td class="h-text" style="padding:14px 0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; font-weight:600; color:#2E443C; text-align:right; border-bottom:1px solid #F5ECD0;">
        &#8377;${item.price || item.productPrice}
      </td>
    </tr>
  `).join('');

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
    .border-soft { border-color:#2B362F !important; }
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
            Order confirmed.
          </h2>
          <p class="b-text" style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:14px; color:#666666; line-height:1.75; max-width:420px;">
            Thank you for your order. We&#8217;re preparing your items for shipment and will keep you updated.
          </p>
        </td>
      </tr>

      <!-- CTA -->
      <tr>
        <td align="center" style="padding:28px 40px 44px;">
          <a href="https://urbannook.in/orders"
             style="display:inline-block; background-color:#2E443C; color:#ffffff; text-decoration:none; padding:14px 44px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:12px; font-weight:600; letter-spacing:2.5px; text-transform:uppercase;">
            Track Your Order
          </a>
          <p class="m-text" style="margin:16px 0 0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; color:#AAAAAA; letter-spacing:0.5px;">
            Order&nbsp;ID&nbsp;<strong class="h-text" style="color:#2E443C; letter-spacing:1px;">#${orderId}</strong>
          </p>
        </td>
      </tr>

      <!-- SECTION DIVIDER -->
      <tr><td style="padding:0 40px;"><div class="divider" style="height:1px; background-color:#F5DEB3;"></div></td></tr>

      <!-- ORDER SUMMARY LABEL -->
      <tr>
        <td class="pad-mobile" style="padding:32px 40px 18px;">
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td class="divider" style="border-bottom:1px solid #F5DEB3; padding-bottom:7px;">
                <span class="h-text" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; font-weight:700; letter-spacing:3px; color:#2E443C; text-transform:uppercase;">
                  Order Summary
                </span>
                <span class="m-text" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; color:#AAAAAA; margin-left:10px; font-weight:400; text-transform:none; letter-spacing:0;">
                  ${items.length} item${items.length !== 1 ? 's' : ''}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- ITEMS TABLE -->
      <tr>
        <td class="pad-mobile" style="padding:0 40px 8px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <thead>
              <tr>
                <th class="m-text" style="padding:0 0 10px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; font-weight:600; color:#AAAAAA; text-transform:uppercase; letter-spacing:2px; text-align:left; border-bottom:1px solid #F5ECD0;">Item</th>
                <th class="m-text" style="padding:0 0 10px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; font-weight:600; color:#AAAAAA; text-transform:uppercase; letter-spacing:2px; text-align:center; border-bottom:1px solid #F5ECD0;">Qty</th>
                <th class="m-text" style="padding:0 0 10px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; font-weight:600; color:#AAAAAA; text-transform:uppercase; letter-spacing:2px; text-align:right; border-bottom:1px solid #F5ECD0;">Price</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot>
              <tr>
                <td colspan="2" class="h-text" style="padding:18px 0 4px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:10px; font-weight:700; color:#2E443C; text-transform:uppercase; letter-spacing:2.5px; border-top:1px solid #F5DEB3; text-align:right; padding-right:24px;">
                  Total
                </td>
                <td class="h-text" style="padding:18px 0 4px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:17px; font-weight:700; color:#2E443C; border-top:1px solid #F5DEB3; text-align:right;">
                  &#8377;${total}
                </td>
              </tr>
            </tfoot>
          </table>
        </td>
      </tr>

      <!-- PAYMENT METHOD -->
      <tr>
        <td class="pad-mobile" style="padding:20px 40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" class="bg-soft" style="background-color:#F7F4EF; border-radius:2px;">
            <tr>
              <td style="padding:16px 20px;">
                <p class="h-text" style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; color:#2E443C; line-height:1.7;">
                  ${isCOD
                    ? `<strong>Cash on Delivery</strong> &mdash; &#8377;${codDetails?.partialAmountPaid ?? 0} paid in advance, &#8377;${codDetails?.remainingAmount ?? 0} due at delivery.`
                    : `<strong>Paid online</strong> via Razorpay.`}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- SECTION DIVIDER -->
      <tr><td style="padding:20px 40px 0;"><div class="divider" style="height:1px; background-color:#F5DEB3;"></div></td></tr>

      <!-- DELIVERY ADDRESS -->
      ${deliveryAddress ? `
      <tr>
        <td class="pad-mobile" style="padding:32px 40px 0;">
          <p class="m-text" style="margin:0 0 18px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; font-weight:700; color:#AAAAAA; text-transform:uppercase; letter-spacing:3px;">
            Delivery Address
          </p>
          <p class="b-text" style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; color:#444444; line-height:1.85;">
            <strong class="h-text" style="color:#2E443C; font-weight:600;">${deliveryAddress.name || ''}</strong><br/>
            ${deliveryAddress.addressLine1 || ''}<br/>
            ${deliveryAddress.addressLine2 ? deliveryAddress.addressLine2 + '<br/>' : ''}
            ${deliveryAddress.city || ''}, ${deliveryAddress.state || ''} ${deliveryAddress.pincode || ''}<br/>
            ${deliveryAddress.phone || ''}
          </p>
        </td>
      </tr>
      ` : ''}

      <!-- CONTACT INFORMATION -->
      ${senderMobile || receiverMobile ? `
      <tr>
        <td class="pad-mobile" style="padding:24px 40px 0;">
          <p class="m-text" style="margin:0 0 10px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9px; font-weight:700; color:#AAAAAA; text-transform:uppercase; letter-spacing:3px;">
            Contact Information
          </p>
          <p class="b-text" style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; color:#444444; line-height:1.85;">
            ${senderMobile && receiverMobile && senderMobile === receiverMobile ? `
              <strong class="h-text" style="color:#2E443C; font-weight:600;">Contact Number:</strong> ${senderMobile}
            ` : `
              ${senderMobile ? `<strong class="h-text" style="color:#2E443C; font-weight:600;">Payment Contact:</strong> ${senderMobile}<br/>` : ''}
              ${receiverMobile && receiverMobile !== senderMobile ? `<strong class="h-text" style="color:#2E443C; font-weight:600;">Delivery Contact:</strong> ${receiverMobile}` : ''}
            `}
          </p>
        </td>
      </tr>
      ` : ''}

      <!-- SPACER -->
      <tr><td style="padding:24px 0 0;"></td></tr>

      <!-- FOOTER -->
      <tr>
        <td class="bg-soft pad-mobile" style="background-color:#F7F4EF; padding:32px 40px 36px; border-top:1px solid #EEE8DC;">
          <p class="b-text" style="margin:0 0 20px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; color:#666666; line-height:1.75;">
            Questions about your order? Contact UrbanNook at
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

export default orderConfirmationTemplate;
