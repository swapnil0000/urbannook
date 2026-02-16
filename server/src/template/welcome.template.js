const welcomeTemplate = ({ userName }) => {
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
                  <h2 style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:24px; font-weight:300; color:#2E443C;">
                    Welcome to UrbanNook! 🎉
                  </h2>
                </td>
              </tr>

              <!-- HERO IMAGE -->
              <tr>
                <td align="center" style="padding:0 20px 25px 20px;">
                  <img 
                    src="https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif"
                    alt="Welcome"
                    width="520"
                    style="display:block; width:100%; max-width:520px; height:auto; border-radius:10px;"
                  />
                </td>
              </tr>

              <!-- CONTENT -->
              <tr>
                <td style="padding:0 30px 20px 30px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.7; color:#2E443C;">
                  <p style="margin:0 0 16px 0;">Hi ${userName},</p>
                  <p style="margin:0 0 16px 0;">
                    Thank you for joining <strong>UrbanNook</strong>! We're thrilled to have you as part of our community.
                  </p>
                  <p style="margin:0 0 16px 0;">
                    We're here to help you create a warm, aesthetic space with thoughtfully curated essentials for your home and workspace.
                  </p>
                  <p style="margin:0 0 16px 0;">
                    <strong>What's next?</strong>
                  </p>
                  <ul style="margin:0 0 16px 0; padding-left:20px;">
                    <li style="margin-bottom:8px;">Browse our collection of aesthetic products</li>
                    <li style="margin-bottom:8px;">Add items to your wishlist</li>
                    <li style="margin-bottom:8px;">Enjoy a seamless shopping experience</li>
                  </ul>
                  <p style="margin:0 0 20px 0;">
                    If you have any questions, our support team is always here to help.
                  </p>
                </td>
              </tr>

              <!-- CTA BUTTON -->
              <tr>
                <td align="center" style="padding:0 30px 30px 30px;">
                  <a href="https://urbannook.in/products" 
                     style="display:inline-block; background-color:#2E443C; color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:8px; font-family:Arial, Helvetica, sans-serif; font-size:16px; font-weight:600;">
                    Start Shopping
                  </a>
                </td>
              </tr>

              <!-- SOCIAL ICONS -->
              <tr>
                <td align="center" style="padding:0 20px 30px 20px;">
                  <p style="margin:0 0 12px 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#2E443C;">
                    Stay connected with us
                  </p>
                  <table cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                      <td style="padding:0 8px;">
                        <a href="https://www.instagram.com/urbannook.store" target="_blank">
                          <img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" 
                               width="24" height="24" alt="Instagram" style="display:block; border:0;">
                        </a>
                      </td>
                    </tr>
                  </table>
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

export default welcomeTemplate;
