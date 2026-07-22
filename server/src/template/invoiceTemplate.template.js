export const generateInvoiceHtmlTemplate = (order) => {
  const discount = order.coupon?.discountAmount || 0;
  const shippingCharge = Number(order.items[0]?.productSnapshot?.shipping) || 0;
  const addr = order.deliveryAddress || {};

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FAFAF8; padding: 30px; margin: 0; }
      .card { max-width: 850px; margin: 0 auto; background: #fff; border: 1px solid #EEE8DC; overflow: hidden; }
      .header { background: #2E443C; padding: 32px 40px; display: flex; justify-content: space-between; align-items: center; }
      .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 600; letter-spacing: -0.3px; }
      .content { padding: 40px; color: #333; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
      .section-title { font-weight: 700; color: #2E443C; border-bottom: 1px solid #F5DEB3; margin-bottom: 10px; padding-bottom: 6px; text-transform: uppercase; font-size: 9px; letter-spacing: 2px; }
      .info-text { font-size: 13px; line-height: 1.6; margin: 0; color: #444; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
      th { background: #F7F4EF; color: #2E443C; padding: 12px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 1px solid #F5DEB3; }
      td { padding: 12px; border-bottom: 1px solid #F5ECD0; color: #444; }
      .totals-wrapper { display: flex; justify-content: flex-end; margin-top: 30px; }
      .totals-box { background: #F7F4EF; border: 1px solid #F5DEB3; padding: 20px; width: 250px; }
      .totals-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px; color: #444; }
      .grand-total { font-weight: 700; color: #2E443C; border-top: 1px solid #2E443C; padding-top: 10px; margin-top: 10px; font-size: 16px; }
      .footer { text-align: center; margin-top: 50px; font-size: 11px; color: #AAAAAA; }
      .center { text-align: center; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <h1>UrbanNook</h1>
        <div style="text-align: right;">
          <h2 style="margin:0; font-size:16px; color:#F5DEB3; font-weight:600; letter-spacing:1px;">INVOICE</h2>
          <p style="margin:0; font-size:11px; color:rgba(255,255,255,0.65);">#INV-${order.orderId.slice(-6)}</p>
        </div>
      </div>
      <div class="content">
        <div class="grid">
          <div>
            <div class="section-title">Order Details</div>
            <p class="info-text"><strong>Date:</strong> ${new Date(order.createdAt).toDateString()}</p>
            <p class="info-text"><strong>Order ID:</strong> ${order.orderId}</p>
            <p class="info-text"><strong>Status:</strong> ${order.status}</p>
          </div>
          <div style="text-align: right;">
            <div class="section-title">Billing To</div>
            <p class="info-text"><strong>${order.userName || addr.fullName}</strong></p>
            <p class="info-text">${order.userEmail}</p>
            <p class="info-text">+91 ${order.userMobile || addr.mobileNumber}</p>
          </div>
        </div>
        <div class="grid">
          <div>
            <div class="section-title">Shipping Address</div>
            <p class="info-text">${addr.fullName}</p>
            <p class="info-text">${addr.addressLine || addr.flatOrFloorNumber || ''}</p>
            <p class="info-text">${addr.city}, ${addr.state} - ${addr.pinCode}</p>
            <p class="info-text">Landmark: ${addr.landmark || 'N/A'}</p>
          </div>
        </div>
        <table>
          <thead>
            <tr><th>Item</th><th class="center">Qty</th><th class="center">Price</th><th class="center">Total</th></tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
              <tr>
                <td>
                  ${item.productSnapshot.productName}
                  ${item.productSnapshot.selectedVariant && item.productSnapshot.selectedVariant !== 'N/A'
                   ? `<br/><small style="color: #666;">Variant: ${item.productSnapshot.selectedVariant}</small>`
                   : ''}
                  }
                <td class="center">${item.productSnapshot.quantity}</td>
                <td class="center">₹${item.productSnapshot.priceAtPurchase}</td>
                <td class="center">₹${item.productSnapshot.priceAtPurchase * item.productSnapshot.quantity}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="totals-wrapper">
          <div class="totals-box">
            <div class="totals-row"><span>Shipping:</span><span>₹${shippingCharge}</span></div>
            ${discount > 0 ? `<div class="totals-row"><span>Discount:</span><span>-₹${discount}</span></div>` : ''}
            <div class="totals-row grand-total"><span>Grand Total:</span><span>₹${order.amount}</span></div>
          </div>
        </div>
        <div class="footer">Thank you for shopping with UrbanNook!</div>
      </div>
    </div>
  </body>
  </html>
  `;
};