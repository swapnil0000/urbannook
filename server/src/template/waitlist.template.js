const waitlistTemplate = ({ userName, logoUrl }) => {
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

<!-- OUTER WRAPPER -->
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" 
       style="width:100%; background-color:#2E443C; padding:20px 10px;">
  <tr>
    <td align="center">

      <!-- CONTAINER -->
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" 
             style="width:100%; max-width:600px;">

        <!-- LOGO -->
        <tr>
          <td align="center" style="padding:20px 0;">
            <a href="https://urbannook.in" target="_blank">
              <img 
                src="${logoUrl}"
                alt="Urban Nook"
                width="70"
                height="auto"
                style="display:block; border:0; max-width:70px; width:70px; height:auto; margin:0 auto;"
              />
            </a>
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
                  <h2 style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:20px; font-weight:300; color:#2E443C;">
                    Welcome to the Inner Circle.
                  </h2>
                </td>
              </tr>

              <!-- IMAGE -->
              <tr>
                <td align="center" style="padding:0 20px 25px 20px;">
                  <img 
                    src="https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif"
                    alt="Working hard..."
                    width="520"
                    style="display:block; width:100%; max-width:520px; height:auto; border-radius:10px;"
                  />
                </td>
              </tr>


              <!-- CONTENT -->
              <tr>
                <td style="padding:0 25px 10px 25px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.7; color:#2E443C;">
                  <p style="margin:0 0 16px 0;">Hi ${userName},</p>
                  <p style="margin:0 0 16px 0;">
                    We're building a collection of affordable, aesthetic essentials to elevate your workspace. We won't keep you waiting long as launch day is approaching fast.
                  </p>
                  <p style="margin:0 0 16px 0;">
                    Keep an eye on your inbox your <strong>members-only discount code</strong> will arrive before we go live.
                  </p>
                  <p style="margin:0 0 0 0; text-align:center;">
                    Until then, see what we're building over at
                  </p>
                </td>
              </tr>

              <!-- SOCIAL ICONS (INSIDE WHITE CARD) -->
              <tr>
                <td align="center" style="padding:0px 20px 15px 20px;">
                  <table cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                      <td style="padding:0px 8px 0px 12px;">
                        <a href="https://www.instagram.com/urbannook.store" target="_blank">
                          <img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" 
                               width="22" height="22" alt="Instagram" style="display:block; border:0;">
                        </a>
                      </td>
                      <td style="padding:0px 12px 0px 8px;">
                        <a href="https://www.youtube.com/" target="_blank">
                          <img src="https://cdn-icons-png.flaticon.com/512/1384/1384060.png" 
                               width="22" height="22" alt="YouTube" style="display:block; border:0;">
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
export default waitlistTemplate;
