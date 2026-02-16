# Testing Production API Locally

This guide explains how to test your application with the production API while running locally.

## Quick Start

### Option 1: Use .env.production.local (Recommended)

The `.env.production.local` file has been created for you. This file takes precedence over `.env.local` when running in development mode.

**To activate it:**

1. Rename or temporarily move your `.env.local` file:
   ```bash
   mv .env.local .env.local.backup
   ```

2. Rename `.env.production.local` to `.env.local`:
   ```bash
   mv .env.production.local .env.local
   ```

3. Start your development server:
   ```bash
   npm run dev
   ```

Your local app will now connect to the production API at `https://api.urbannook.in/api/v1`

**To switch back to local API:**

1. Restore your original `.env.local`:
   ```bash
   mv .env.local .env.production.local
   mv .env.local.backup .env.local
   ```

2. Restart your dev server

### Option 2: Temporarily Edit .env.local

Simply change the `VITE_API_BASE_URL` in your `.env.local` file:

```env
# Change from:
VITE_API_BASE_URL=http://localhost:8000/api/v1

# To:
VITE_API_BASE_URL=https://api.urbannook.in/api/v1
```

Then restart your dev server.

## What Was Fixed

### Cart & Wishlist UI Sync Issues

The issue where cart and wishlist items showed as "already added" in the backend but didn't reflect in the UI has been fixed:

**Changes made:**

1. **Added proper cache tags** in `client/src/store/api/userApi.js`:
   - Cart queries now provide both `['User', 'Cart']` tags
   - Cart mutations invalidate both `['User', 'Cart']` tags
   - Wishlist queries provide both `['Wishlist', 'User']` tags
   - Wishlist mutations invalidate both `['Wishlist', 'User']` tags

2. **Removed manual cache invalidation** in `client/src/pages/shop/ProductDetailPage.jsx`:
   - RTK Query now automatically handles cache invalidation
   - No need to manually call `dispatch(userApi.util.invalidateTags([...]))`

3. **How it works now:**
   - When you add/remove items from cart/wishlist, the mutation automatically invalidates the cache
   - RTK Query automatically refetches the cart/wishlist data
   - The `useCartSync` and `useWishlistSync` hooks detect the new data
   - Redux state is updated automatically
   - UI reflects the changes immediately

## Testing Checklist

When testing with production API locally:

- [ ] Login/Signup works
- [ ] Add to cart reflects immediately in cart icon
- [ ] Add to wishlist reflects immediately in wishlist page
- [ ] Remove from cart updates UI
- [ ] Remove from wishlist updates UI
- [ ] Cart quantity updates work
- [ ] Checkout flow works
- [ ] Order history loads

## Important Notes

1. **CORS**: Make sure your production API allows requests from `http://localhost:3000` or `http://localhost:5173`

2. **Cookies**: Production cookies may not work locally due to domain restrictions. You may need to:
   - Clear your browser cookies
   - Use incognito mode
   - Or test authentication flow from scratch

3. **Data**: You'll be working with production data, so be careful not to create test orders or spam data

4. **Environment Variables**: After testing, remember to switch back to local API configuration

## Troubleshooting

### Cart/Wishlist still not updating?

1. Clear browser cache and cookies
2. Check browser console for errors
3. Verify the API response in Network tab
4. Make sure you're logged in
5. Try hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### API calls failing?

1. Check if production API is running
2. Verify CORS settings on production server
3. Check if your IP is allowed (if there's IP whitelisting)
4. Verify the API URL is correct in .env file

### Still having issues?

Check the browser console and network tab for specific error messages.
