const contactNotificationTemplate = ({ name, email, subject, message, timestamp }) => {
  const formattedDate = new Date(timestamp).toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short'
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Contact Form Submission</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #2e443c 0%, #1c3026 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="margin: 0; color: #F5DEB3; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                    🔔 New Contact Submission
                  </h1>
                  <p style="margin: 10px 0 0 0; color: #e8e6e1; font-size: 14px; opacity: 0.9;">
                    Urban Nook Contact Form
                  </p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  
                  <!-- Timestamp -->
                  <div style="background-color: #f8f9fa; border-left: 4px solid #F5DEB3; padding: 15px 20px; margin-bottom: 30px; border-radius: 8px;">
                    <p style="margin: 0; color: #6c757d; font-size: 13px; font-weight: 600;">
                      📅 Received: ${formattedDate}
                    </p>
                  </div>

                  <!-- Submission Details -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                    
                    <!-- Name -->
                    <tr>
                      <td style="padding: 15px 0; border-bottom: 1px solid #e9ecef;">
                        <p style="margin: 0 0 5px 0; color: #6c757d; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                          Name
                        </p>
                        <p style="margin: 0; color: #2e443c; font-size: 16px; font-weight: 500;">
                          ${name}
                        </p>
                      </td>
                    </tr>

                    <!-- Email -->
                    <tr>
                      <td style="padding: 15px 0; border-bottom: 1px solid #e9ecef;">
                        <p style="margin: 0 0 5px 0; color: #6c757d; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                          Email
                        </p>
                        <p style="margin: 0;">
                          <a href="mailto:${email}" style="color: #2e443c; font-size: 16px; font-weight: 500; text-decoration: none;">
                            ${email}
                          </a>
                        </p>
                      </td>
                    </tr>

                    <!-- Subject -->
                    <tr>
                      <td style="padding: 15px 0; border-bottom: 1px solid #e9ecef;">
                        <p style="margin: 0 0 5px 0; color: #6c757d; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                          Subject
                        </p>
                        <p style="margin: 0;">
                          <span style="display: inline-block; background-color: #F5DEB3; color: #2e443c; padding: 6px 12px; border-radius: 6px; font-size: 14px; font-weight: 600;">
                            ${subject}
                          </span>
                        </p>
                      </td>
                    </tr>

                    <!-- Message -->
                    <tr>
                      <td style="padding: 15px 0;">
                        <p style="margin: 0 0 10px 0; color: #6c757d; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                          Message
                        </p>
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef;">
                          <p style="margin: 0; color: #2e443c; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">
${message}
                          </p>
                        </div>
                      </td>
                    </tr>

                  </table>

                  <!-- Action Button -->
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${process.env.ADMIN_DASHBOARD_URL || 'http://localhost:3000/admin'}/contacts" 
                       style="display: inline-block; background-color: #2e443c; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; letter-spacing: 0.5px;">
                      View in Dashboard →
                    </a>
                  </div>

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="margin: 0; color: #6c757d; font-size: 12px; line-height: 1.5;">
                    This is an automated notification from Urban Nook Contact Form.<br>
                    Please respond to the customer at <a href="mailto:${email}" style="color: #2e443c; text-decoration: none; font-weight: 600;">${email}</a>
                  </p>
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

export default contactNotificationTemplate;
