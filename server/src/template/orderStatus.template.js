const orderStatusTemplate = ({ orderId, status }) => {
  const statusConfig = {
    CONFIRMED: {
      title: 'Order Confirmed',
      message: 'Your order has been confirmed and is being prepared.',
      icon: '✓',
      color: '#4CAF50'
    },
    PROCESSING: {
      title: 'Order Processing',
      message: 'Your order is being processed and will be shipped soon.',
      icon: '📦',
      color: '#2196F3'
    },
    SHIPPED: {
      title: 'Order Shipped',
      message: 'Your order has been shipped and is on its way to you!',
      icon: '🚚',
      color: '#FF9800'
    },
    DELIVERED: {
      title: 'Order Delivered',
      message: 'Your order has been delivered. We hope you love it!',
      icon: '🎉',
      color: '#4CAF50'
    },
    CANCELLED: {
      title: 'Order Cancelled',
      message: 'Your order has been cancelled. If you have any questions, please contact our support team.',
      icon: '✕',
      color: '#F44336'
    }
  };

  const config = statusConfig[status] || statusConfig.CONFIRMED;

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
              
              <!-- STATUS ICON -->
              <tr>
                <td align="center" style="padding:30px 20px 10px 20px;">
                  <div style="width:60px; height:60px; background-color:${config.color}; border-radius:50%; display:inline-flex; align-items:center; justify-content:center;">
                    <span style="color:#ffffff; font-size:32px;">${config.icon}</span>
                  </div>
                </td>
              </tr>

              <!-- TITLE -->
              <tr>
                <td align="center" style="padding:10px 20px 20px 20px;">
                  <h2 style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:24px; font-weight:600; color:#2E443C;">
                    ${config.title}
                  </h2>
                  <p style="margin:8px 0 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#666;">
                    Order #${orderId}
                  </p>
                </td>
              </tr>

              <!-- CONTENT -->
              <tr>
                <td style="padding:0 30px 20px 30px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.7; color:#2E443C; text-align:center;">
                  <p style="margin:0 0 16px 0;">
                    ${config.message}
                  </p>
                </td>
              </tr>

              <!-- STATUS TIMELINE (for non-cancelled orders) -->
              ${status !== 'CANCELLED' ? `
              <tr>
                <td style="padding:0 30px 20px 30px;">
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                      <td align="center" style="padding:10px;">
                        <div style="display:inline-block; text-align:center;">
                          <div style="width:40px; height:40px; background-color:${status === 'CONFIRMED' || status === 'PROCESSING' || status === 'SHIPPED' || status === 'DELIVERED' ? '#4CAF50' : '#E5E5E5'}; border-radius:50%; margin:0 auto 8px; display:flex; align-items:center; justify-content:center; color:#ffffff; font-weight:700;">
                            ✓
                          </div>
                          <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#666;">
                            Confirmed
                          </p>
                        </div>
                      </td>
                      <td style="padding:10px 0; border-bottom:2px solid ${status === 'PROCESSING' || status === 'SHIPPED' || status === 'DELIVERED' ? '#4CAF50' : '#E5E5E5'}; width:20%;"></td>
                      <td align="center" style="padding:10px;">
                        <div style="display:inline-block; text-align:center;">
                          <div style="width:40px; height:40px; background-color:${status === 'PROCESSING' || status === 'SHIPPED' || status === 'DELIVERED' ? '#4CAF50' : '#E5E5E5'}; border-radius:50%; margin:0 auto 8px; display:flex; align-items:center; justify-content:center; color:#ffffff; font-weight:700;">
                            ${status === 'PROCESSING' || status === 'SHIPPED' || status === 'DELIVERED' ? '✓' : '2'}
                          </div>
                          <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#666;">
                            Processing
                          </p>
                        </div>
                      </td>
                      <td style="padding:10px 0; border-bottom:2px solid ${status === 'SHIPPED' || status === 'DELIVERED' ? '#4CAF50' : '#E5E5E5'}; width:20%;"></td>
                      <td align="center" style="padding:10px;">
                        <div style="display:inline-block; text-align:center;">
                          <div style="width:40px; height:40px; background-color:${status === 'SHIPPED' || status === 'DELIVERED' ? '#4CAF50' : '#E5E5E5'}; border-radius:50%; margin:0 auto 8px; display:flex; align-items:center; justify-content:center; color:#ffffff; font-weight:700;">
                            ${status === 'SHIPPED' || status === 'DELIVERED' ? '✓' : '3'}
                          </div>
                          <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#666;">
                            Shipped
                          </p>
                        </div>
                      </td>
                      <td style="padding:10px 0; border-bottom:2px solid ${status === 'DELIVERED' ? '#4CAF50' : '#E5E5E5'}; width:20%;"></td>
                      <td align="center" style="padding:10px;">
                        <div style="display:inline-block; text-align:center;">
                          <div style="width:40px; height:40px; background-color:${status === 'DELIVERED' ? '#4CAF50' : '#E5E5E5'}; border-radius:50%; margin:0 auto 8px; display:flex; align-items:center; justify-content:center; color:#ffffff; font-weight:700;">
                            ${status === 'DELIVERED' ? '✓' : '4'}
                          </div>
                          <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#666;">
                            Delivered
                          </p>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              ` : ''}

              <!-- CTA BUTTON -->
              <tr>
                <td align="center" style="padding:20px 30px 30px 30px;">
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

export default orderStatusTemplate;
