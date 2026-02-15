# Razorpay Configuration Guide

## Overview
The application automatically uses the correct Razorpay credentials based on the `NODE_ENV` environment variable:
- **Development/Test**: Uses `RP_LOCAL_TEST_KEY_ID` and `RP_LOCAL_TEST_SECRET`
- **Production**: Uses `RP_PROD_KEY_ID` and `RP_PROD_SECRET`

## Environment Variables

### Test Mode (Development)
```env
NODE_ENV=development
RP_LOCAL_TEST_KEY_ID=rzp_test_xxxxxxxxxxxxx
RP_LOCAL_TEST_SECRET=your_test_secret_here
RP_WEBHOOK_TEST_SECRET=your_webhook_test_secret
```

### Production Mode
```env
NODE_ENV=production
RP_PROD_KEY_ID=rzp_live_xxxxxxxxxxxxx
RP_PROD_SECRET=your_production_secret_here
RP_WEBHOOK_PROD_SECRET=your_webhook_prod_secret
```

## How to Add Production Credentials

### Step 1: Get Your Razorpay Live Credentials
1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Switch to **Live Mode** (toggle in top-right corner)
3. Go to **Settings** → **API Keys**
4. Generate new API keys if you haven't already
5. Copy your **Key ID** (starts with `rzp_live_`) and **Key Secret**

### Step 2: Add to Production Server

#### Option A: Direct .env File (Render, DigitalOcean, etc.)
1. SSH into your production server
2. Edit the `.env` file:
   ```bash
   nano /path/to/your/server/.env
   ```
3. Add the production credentials:
   ```env
   RP_PROD_KEY_ID=rzp_live_your_actual_key_id
   RP_PROD_SECRET=your_actual_production_secret
   RP_WEBHOOK_PROD_SECRET=your_actual_webhook_secret
   ```
4. Restart your server

#### Option B: Platform Environment Variables (Heroku, Vercel, Render)
1. Go to your platform's dashboard
2. Navigate to Environment Variables section
3. Add these variables:
   - `RP_PROD_KEY_ID` = `rzp_live_xxxxxxxxxxxxx`
   - `RP_PROD_SECRET` = `your_production_secret`
   - `RP_WEBHOOK_PROD_SECRET` = `your_webhook_secret`
4. Redeploy your application

### Step 3: Set NODE_ENV to Production
Ensure your production server has:
```env
NODE_ENV=production
```

## Security Best Practices

### ✅ DO:
- Store production credentials ONLY on the production server
- Use environment variables, never hardcode credentials
- Rotate your API keys periodically
- Use webhook secrets to verify payment callbacks
- Keep your `.env` file in `.gitignore`

### ❌ DON'T:
- Never commit production credentials to Git
- Never share credentials in chat, email, or Slack
- Never use production credentials in development
- Never expose credentials in client-side code
- Never log credentials in console or files

## Testing

### Test Mode (Development)
```bash
# Your .env should have:
NODE_ENV=development
RP_LOCAL_TEST_KEY_ID=rzp_test_xxxxx
RP_LOCAL_TEST_SECRET=test_secret

# Start server
npm run dev
```

### Production Mode (Before Deploying)
```bash
# Temporarily set production mode locally to test
NODE_ENV=production npm start

# Check logs for:
# [INFO] Razorpay order created in PRODUCTION mode: order_xxxxx
```

## Webhook Configuration

### Test Webhooks
1. Go to Razorpay Dashboard → **Test Mode**
2. Settings → **Webhooks**
3. Add webhook URL: `https://your-test-domain.com/api/v1/payment/webhook`
4. Copy the webhook secret to `RP_WEBHOOK_TEST_SECRET`

### Production Webhooks
1. Go to Razorpay Dashboard → **Live Mode**
2. Settings → **Webhooks**
3. Add webhook URL: `https://your-production-domain.com/api/v1/payment/webhook`
4. Copy the webhook secret to `RP_WEBHOOK_PROD_SECRET`

## Troubleshooting

### Error: "Razorpay credentials not configured"
- Check that you've added the correct environment variables
- Verify `NODE_ENV` is set correctly
- Restart your server after adding credentials

### Payments Failing in Production
- Verify you're using **Live Mode** credentials (starts with `rzp_live_`)
- Check that your Razorpay account is activated for live payments
- Ensure your bank account is verified in Razorpay dashboard

### Webhook Signature Verification Failing
- Verify webhook secret matches the one in Razorpay dashboard
- Check that you're using the correct secret for the environment (test vs prod)

## Current Configuration

The payment service (`server/src/services/rp.payement.service.js`) automatically:
1. Detects the environment from `NODE_ENV`
2. Selects the appropriate credentials
3. Logs which mode is being used (TEST or PRODUCTION)
4. Validates that credentials exist before making API calls

## Support

For Razorpay-specific issues:
- Documentation: https://razorpay.com/docs/
- Support: https://razorpay.com/support/

For application issues:
- Check server logs for detailed error messages
- All payment operations are logged with `[INFO]` or `[ERROR]` prefixes
