const bulkEmailWaitlistTemplate = ({ userName, WAITLIST_COUPON_CODE }) => {
  // Fallback if userName is missing
  const name = userName || "UrbanNook Member";
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to UrbanNook</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center" style="padding: 40px 10px;">
        
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden;">
          
          <tr>
            <td align="center" style="background-color: #1a1a1a; padding: 30px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 2px; text-transform: uppercase;">UrbanNook</h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; font-size: 24px; margin-top: 0; text-align: center;">You're In! The Wait is Over 🚀</h2>
              
              <p style="color: #555555; font-size: 16px; line-height: 1.6; text-align: center;">
                Hi <strong>${name}</strong>,<br><br>
                Thank you for joining our waitlist. We are thrilled to welcome you to the club. As promised, here is your exclusive access reward.
              </p>

              <div style="margin: 30px 0; text-align: center;">
                <div style="background-color: #f0fdf4; border: 2px dashed #2ecc71; border-radius: 8px; padding: 20px; display: inline-block;">
                  <span style="display: block; font-size: 14px; color: #666; margin-bottom: 5px;">Your Exclusive Code</span>
                  <span style="font-size: 28px; font-weight: 800; color: #2ecc71; letter-spacing: 2px;">${WAITLIST_COUPON_CODE}</span>
                </div>
              </div>

              <p style="color: #555555; font-size: 16px; line-height: 1.6; text-align: center;">
                You can use this code at checkout to get your order. Don't wait—your favorite items are ready for you.
              </p>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-top: 20px; padding-bottom: 20px;">
                    <a href="https://urbannook.in" target="_blank" style="background-color: #1a1a1a; color: #ffffff; padding: 14px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">Shop Now</a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} UrbanNook. All rights reserved.<br>
                If you have any questions, reply to this email.
              </p>
            </td>
          </tr>

        </table>
        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
          You received this email because you signed up for the UrbanNook waitlist.
        </p>

      </td>
    </tr>
  </table>

</body>
</html>
  `;
};

export default bulkEmailWaitlistTemplate;
