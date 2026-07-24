// Quick visual preview generator — NOT a test suite.
// Run: node src/template/__preview__/generatePreviews.js
// Renders every template with sample data into HTML files you can open in a browser.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import '../config/envConfigSetup.js'; // loads real .env values (real logo URLs, admin email, etc.)

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = __dirname;

const sampleItems = [
  { productName: 'Ceramic Table Lamp', quantity: 1, price: 1499 },
  { productName: 'Woven Jute Rug', variant: '5x7 ft', quantity: 2, price: 3299 },
];

const sampleAddress = {
  name: 'Aarav Mehta',
  addressLine1: '221B, Sunrise Apartments',
  addressLine2: 'Koramangala 5th Block',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560095',
  phone: '9876543210',
};

const pages = [
  {
    file: 'orderConfirmation.template.js',
    name: 'orderConfirmation-prepaid',
    data: {
      orderId: 'UN-100234',
      items: sampleItems,
      total: 8097,
      deliveryAddress: sampleAddress,
      orderDate: new Date(),
      senderMobile: '9876543210',
      receiverMobile: '9123456780',
      paymentMethod: 'PREPAID',
    },
  },
  {
    file: 'orderConfirmation.template.js',
    name: 'orderConfirmation-cod',
    data: {
      orderId: 'UN-100235',
      items: sampleItems,
      total: 8097,
      deliveryAddress: sampleAddress,
      orderDate: new Date(),
      senderMobile: '9876543210',
      receiverMobile: '9876543210',
      paymentMethod: 'COD',
      codDetails: { partialAmountPaid: 200, remainingAmount: 7897 },
    },
  },
  {
    file: 'paymentReceipt.template.js',
    name: 'paymentReceipt-prepaid',
    data: {
      paymentId: 'pay_QwErTy123',
      amount: 8097,
      orderId: 'UN-100234',
      date: new Date(),
      paymentMethod: 'Razorpay',
    },
  },
  {
    file: 'paymentReceipt.template.js',
    name: 'paymentReceipt-cod',
    data: {
      paymentId: 'pay_QwErTy456',
      amount: 200,
      orderId: 'UN-100235',
      date: new Date(),
      paymentMethod: 'COD',
      codDetails: { partialAmountPaid: 200, remainingAmount: 7897 },
    },
  },
  { file: 'otp.template.js', name: 'otp', data: { otp: '482913' } },
  { file: 'welcome.template.js', name: 'welcome', data: { userName: 'Aarav Mehta' } },
  {
    file: 'guestAccountCreated.template.js',
    name: 'guestAccountCreated',
    data: {
      userName: 'Aarav Mehta',
      email: 'aarav.mehta@example.com',
      tempPassword: 'Xk9$mQ2p',
      orderId: 'UN-100234',
    },
  },
  { file: 'orderStatus.template.js', name: 'orderStatus-confirmed', data: { orderId: 'UN-100234', status: 'CONFIRMED' } },
  { file: 'orderStatus.template.js', name: 'orderStatus-processing', data: { orderId: 'UN-100234', status: 'PROCESSING' } },
  { file: 'orderStatus.template.js', name: 'orderStatus-shipped', data: { orderId: 'UN-100234', status: 'SHIPPED' } },
  { file: 'orderStatus.template.js', name: 'orderStatus-delivered', data: { orderId: 'UN-100234', status: 'DELIVERED' } },
  { file: 'orderStatus.template.js', name: 'orderStatus-cancelled', data: { orderId: 'UN-100234', status: 'CANCELLED' } },
  {
    file: 'contactNotification.template.js',
    name: 'contactNotification',
    data: {
      name: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      subject: 'Product Query',
      message: 'Hi, I wanted to ask if the Ceramic Table Lamp is available in blue. Thanks!',
      mobile: '9988776655',
      timestamp: new Date(),
    },
  },
  {
    file: 'bulk.email.waitlist.template.js',
    name: 'bulkEmailWaitlist',
    data: { userName: 'Aarav Mehta', WAITLIST_COUPON_CODE: 'EARLYBIRD20' },
  },
  {
    file: 'waitlist.template.js',
    name: 'waitlist',
    data: { userName: 'Aarav Mehta', logoUrl: process.env.EMAIL_ASSET_DARK_LOGO },
  },
];

// community.template.js exports a pre-built string, not a function
const staticPages = [{ file: 'community.template.js', name: 'community' }];

// invoiceTemplate.template.js exports a named function that takes a full order doc
const invoicePage = {
  file: 'invoiceTemplate.template.js',
  name: 'invoice',
  data: {
    orderId: 'UN-100234',
    createdAt: new Date(),
    status: 'PAID',
    userName: 'Aarav Mehta',
    userEmail: 'aarav.mehta@example.com',
    userMobile: '9876543210',
    amount: 8097,
    coupon: { discountAmount: 200 },
    deliveryAddress: {
      fullName: 'Aarav Mehta',
      addressLine: '221B, Sunrise Apartments, Koramangala 5th Block',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560095',
      landmark: 'Near Forum Mall',
      mobileNumber: '9876543210',
    },
    items: sampleItems.map((i) => ({
      productSnapshot: {
        productName: i.productName,
        selectedVariant: i.variant || 'N/A',
        quantity: i.quantity,
        priceAtPurchase: i.price,
        shipping: '99',
      },
    })),
  },
};

const run = async () => {
  for (const page of pages) {
    const mod = await import(`../${page.file}`);
    const html = mod.default(page.data);
    fs.writeFileSync(path.join(outDir, `${page.name}.html`), html);
    console.log(`Wrote ${page.name}.html`);
  }

  for (const page of staticPages) {
    const mod = await import(`../${page.file}`);
    fs.writeFileSync(path.join(outDir, `${page.name}.html`), mod.default);
    console.log(`Wrote ${page.name}.html`);
  }

  const invoiceMod = await import(`../${invoicePage.file}`);
  const invoiceHtml = invoiceMod.generateInvoiceHtmlTemplate(invoicePage.data);
  fs.writeFileSync(path.join(outDir, `${invoicePage.name}.html`), invoiceHtml);
  console.log(`Wrote ${invoicePage.name}.html`);

  console.log(`\nAll previews written to ${outDir}\nOpen any .html file directly in your browser.`);
};

run();
