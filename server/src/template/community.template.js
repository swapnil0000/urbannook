const communityTemplate = ({ userName, logoUrl }) => {
  return `
          <div style="margin:0;padding:0;background-color:#ffffff;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;padding:20px 0;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" bgcolor="#2E443C" style="background-color:#2E443C;border-radius:12px;overflow:hidden;border:1px solid rgba(0,0,0,0.08);font-family: Arial, sans-serif;">
                    <!-- Header -->
                    <tr>
                      <td bgcolor="#2E443C" style="background-color:#2E443C;padding:30px;text-align:center;color:#ffffff;">
                        <h1 style="margin:0;font-size:28px;letter-spacing:1px;">UrbanNook</h1>
                        <p style="margin:8px 0 0;font-size:14px;opacity:0.85;">
                          Welcome to our Community
                        </p>
                      </td>
                    </tr>

                    <!-- Hero GIF -->
                    <tr>
                      <td bgcolor="#2E443C" style="text-align:center;background-color:#2E443C;">
                        <img 
                          src="https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif" 
                          alt="Warm Home Aesthetic"
                          style="width:100%;max-width:600px;display:block;"
                        />
                      </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                      <td bgcolor="#2E443C" style="padding:35px 40px;color:#ffffff;line-height:1.7;">
                        <h2 style="margin-top:0;font-size:22px;color:#ffffff;">Hi there! 🎉</h2>
                        <p>Thanks for joining the <strong>UrbanNook Community</strong>. We're excited to have you onboard!</p>
                        <p>As a community member, you'll get early access to new features, tips, and updates from UrbanNook.</p>
                        <p style="margin-top: 20px;">We're building something thoughtfully crafted—and now you’re a part of it.</p>
                        <p style="margin-top:30px;">Warm regards,<br/><strong>Team UrbanNook</strong></p>
                      </td>
                    </tr>

                    <!-- Divider -->
                    <tr>
                      <td bgcolor="#2E443C" style="padding:0 40px;">
                        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.25);margin:0;">
                      </td>
                    </tr>

                    <!-- Social + Website Section -->
                    <tr>
                      <td bgcolor="#2E443C" style="padding:25px 40px;text-align:center;color:#ffffff;">
                        <p style="margin:0 0 12px;font-size:14px;">Stay connected with us</p>
                        <p style="margin:0 0 16px;font-size:14px;">🌿 Visit our home: <a href="https://urbannook.in/" target="_blank" style="color:#ffffff;text-decoration:none;font-weight:600;">urbannook.in</a></p>
                        <a href="https://www.instagram.com/urbannook.store" target="_blank" style="text-decoration:none;">
                          <img src="https://media.giphy.com/media/26BRQTezZrKak4BeE/giphy.gif" alt="Follow us on Instagram" width="48" style="border-radius:50%;display:inline-block;">
                        </a>
                        <p style="margin:10px 0 0;font-size:13px;">
                          <a href="https://www.instagram.com/urbannook.store" target="_blank" style="color:#ffffff;text-decoration:none;">@urbannook.store</a>
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td bgcolor="#2E443C" style="background-color:#2E443C;padding:18px;text-align:center;color:#ffffff;font-size:12px;">
                        © UrbanNook — Designed for warm, mindful homes
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
          `;
};
export default communityTemplate;
