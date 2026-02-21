const paymentReceiptTemplate = (paymentDetails) => {
  const { paymentId, amount, orderId, date, paymentMethod = 'Razorpay' } = paymentDetails;
  
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
                  <h2 style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:24px; font-weight:600; color:#2E443C;">
                    Payment Receipt
                  </h2>
                  <p style="margin:8px 0 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#666;">
                    Transaction Successful
                  </p>
                </td>
              </tr>

              <!-- AMOUNT -->
              <tr>
                <td align="center" style="padding:20px 30px;">
                  <div style="background-color:#4CAF50; color:#ffffff; padding:20px; border-radius:12px; display:inline-block;">
                    <p style="margin:0 0 5px 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; opacity:0.9;">
                      Amount Paid
                    </p>
                    <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:36px; font-weight:700;">
                      ₹${amount}
                    </p>
                  </div>
                </td>
              </tr>

              <!-- PAYMENT DETAILS -->
              <tr>
                <td style="padding:0 30px 20px 30px;">
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                         style="border:1px solid #E5E5E5; border-radius:8px;">
                    <tr>
                      <td style="padding:15px; border-bottom:1px solid #E5E5E5;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#666;">
                              Payment ID
                            </td>
                            <td style="font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#2E443C; text-align:right; font-weight:600;">
                              ${paymentId}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:15px; border-bottom:1px solid #E5E5E5;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#666;">
                              Order ID
                            </td>
                            <td style="font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#2E443C; text-align:right; font-weight:600;">
                              ${orderId}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:15px; border-bottom:1px solid #E5E5E5;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#666;">
                              Payment Method
                            </td>
                            <td style="font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#2E443C; text-align:right; font-weight:600;">
                              ${paymentMethod}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:15px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#666;">
                              Date & Time
                            </td>
                            <td style="font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#2E443C; text-align:right; font-weight:600;">
                              ${formattedDate}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- INFO BOX -->
              <tr>
                <td style="padding:0 30px 20px 30px;">
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                         style="background-color:#E8F5E9; border-left:4px solid #4CAF50; padding:15px; border-radius:4px;">
                    <tr>
                      <td style="font-family:Arial, Helvetica, sans-serif; font-size:13px; color:#2E443C;">
                        <strong>✓ Payment Successful</strong><br/>
                        Your payment has been processed successfully. You will receive an order confirmation email shortly.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- CTA BUTTON -->
              <tr>
                <td align="center" style="padding:0 30px 30px 30px;">
                  <a href="https://urbannook.in/account/orders" 
                     style="display:inline-block; background-color:#2E443C; color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:8px; font-family:Arial, Helvetica, sans-serif; font-size:16px; font-weight:600;">
                    View Order Details
                  </a>
                </td>
              </tr>

            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="text-align:center; color:#ffffff; font-size:11px; padding-top:15px;">
            © 2026 Urban Nook. All rights reserved.<br/>
            Keep this receipt for your records.
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

export default paymentReceiptTemplate;
