const orderConfirmationTemplate = (orderDetails) => {
  const { orderId, items = [], total, deliveryAddress, orderDate } = orderDetails;
  
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding:12px 0; border-bottom:1px solid #E5E5E5; font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#2E443C;">
        ${item.productName || item.name}
      </td>
      <td style="padding:12px 0; border-bottom:1px solid #E5E5E5; font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#2E443C; text-align:center;">
        ${item.quantity}
      </td>
      <td style="padding:12px 0; border-bottom:1px solid #E5E5E5; font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#2E443C; text-align:right;">
        ₹${item.price || item.productPrice}
      </td>
    </tr>
  `).join('');

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
              
              <!-- SUCCESS ICON -->
              <tr>
                <td align="center" style="padding:30px 20px 10px 20px;">
                  <div style="width:60px; height:60px; background-color:#4CAF50; border-radius:50%; display:inline-flex; align-items:center; justify-content:center;">
                    <span style="color:#ffffff; font-size:36px;">✓</span>
                  </div>
                </td>
              </tr>

              <!-- TITLE -->
              <tr>
                <td align="center" style="padding:10px 20px 20px 20px;">
                  <h2 style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:24px; font-weight:600; color:#2E443C;">
                    Order Confirmed!
                  </h2>
                  <p style="margin:8px 0 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#666;">
                    Order #${orderId}
                  </p>
                </td>
              </tr>

              <!-- CONTENT -->
              <tr>
                <td style="padding:0 30px 20px 30px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.7; color:#2E443C;">
                  <p style="margin:0 0 16px 0;">
                    Thank you for your order! We're preparing your items for shipment.
                  </p>
                </td>
              </tr>

              <!-- ORDER ITEMS -->
              <tr>
                <td style="padding:0 30px 20px 30px;">
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                      <th style="padding:12px 0; border-bottom:2px solid #2E443C; font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#2E443C; text-align:left; font-weight:600;">
                        Item
                      </th>
                      <th style="padding:12px 0; border-bottom:2px solid #2E443C; font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#2E443C; text-align:center; font-weight:600;">
                        Qty
                      </th>
                      <th style="padding:12px 0; border-bottom:2px solid #2E443C; font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#2E443C; text-align:right; font-weight:600;">
                        Price
                      </th>
                    </tr>
                    ${itemsHtml}
                  </table>
                </td>
              </tr>

              <!-- TOTAL -->
              <tr>
                <td style="padding:0 30px 20px 30px;">
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                         style="background-color:#2E443C; padding:15px; border-radius:8px;">
                    <tr>
                      <td style="font-family:Arial, Helvetica, sans-serif; font-size:16px; color:#ffffff; font-weight:600;">
                        Total Amount
                      </td>
                      <td style="font-family:Arial, Helvetica, sans-serif; font-size:18px; color:#ffffff; text-align:right; font-weight:700;">
                        ₹${total}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- DELIVERY ADDRESS -->
              ${deliveryAddress ? `
              <tr>
                <td style="padding:0 30px 20px 30px;">
                  <p style="margin:0 0 8px 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#2E443C; font-weight:600;">
                    Delivery Address:
                  </p>
                  <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#666; line-height:1.6;">
                    ${deliveryAddress.name || ''}<br/>
                    ${deliveryAddress.addressLine1 || ''}<br/>
                    ${deliveryAddress.addressLine2 ? deliveryAddress.addressLine2 + '<br/>' : ''}
                    ${deliveryAddress.city || ''}, ${deliveryAddress.state || ''} ${deliveryAddress.pincode || ''}<br/>
                    ${deliveryAddress.phone || ''}
                  </p>
                </td>
              </tr>
              ` : ''}

              <!-- CTA BUTTON -->
              <tr>
                <td align="center" style="padding:0 30px 30px 30px;">
                  <a href="https://urbannook.in/account/orders" 
                     style="display:inline-block; background-color:#2E443C; color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:8px; font-family:Arial, Helvetica, sans-serif; font-size:16px; font-weight:600;">
                    Track Your Order
                  </a>
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

export default orderConfirmationTemplate;
