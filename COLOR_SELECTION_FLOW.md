# Color Selection Feature - Complete Flow Documentation

## Overview
The color selection feature allows users to select product colors and have that selection persist through cart, checkout, and order history. The color is stored in the cart and automatically transferred to orders.

## Complete User Flow

### 1. Product Detail Page - Color Selection
**File**: `client/src/pages/shop/ProductDetailPage.jsx`

```javascript
// User sees ColorSelector component (only if product has colors)
{product.colorOptions && product.colorOptions.length > 0 && (
  <ColorSelector
    colors={product.colorOptions}
    selectedColor={selectedColor}
    onColorSelect={setSelectedColor}
  />
)}

// When adding to cart, color is validated
if (product.colorOptions?.length > 0 && !selectedColor) {
  showNotification('Please select a color', 'error');
  return;
}

// Color is sent to backend
await addToCartAPI({ 
  productId: product.productId, 
  quantity: 1,
  selectedColor: selectedColor || undefined
}).unwrap();
```

### 2. Backend - Cart Storage
**File**: `server/src/services/user.cart.service.js`

```javascript
// Color validation happens here
if (productDetails.colorOptions && productDetails.colorOptions.length > 0) {
  if (!selectedColor) {
    throw new ValidationError("Color selection required for this product");
  }
  if (!productDetails.colorOptions.includes(selectedColor)) {
    throw new ValidationError(`Invalid color selection: ${selectedColor}`);
  }
}

// Color is stored in cart
const cartValue = selectedColor 
  ? { quantity: 1, selectedColor }  // New format with color
  : 1;                               // Legacy format without color

productQuanityMap.set(productId, cartValue);
```

**Cart Storage Format**:
```javascript
// In MongoDB, cart.products Map looks like:
{
  "019cb45b-99c2-76c4-ae22-e85ce7c17b13": { quantity: 1, selectedColor: "White" },
  "019cc7d5-43a9-7c24-a024-e724e6164115": 1  // Legacy product without color
}
```

### 3. Cart Display
**File**: `client/src/pages/CheckoutPage.jsx`

```javascript
// Color is displayed in cart
{item.selectedColor && (
  <p className="text-[10px] text-gray-600 mb-1">
    Color: <span className="font-medium">{item.selectedColor}</span>
  </p>
)}
```

### 4. Order Creation - Automatic Color Transfer
**File**: `server/src/controller/rp.payment.controller.js`

**IMPORTANT**: You do NOT need to send `selectedColor` in the create-order API request. The backend automatically reads it from the cart.

```javascript
// Backend fetches the cart
const cart = await Cart.findOne({ userId }).lean();

// For each item, extract selectedColor from cart
const orderItems = items.map((item) => {
  const cartProducts = cart.products instanceof Map 
    ? cart.products 
    : new Map(Object.entries(cart.products || {}));
  
  const cartItem = cartProducts.get(item.productId);
  let selectedColor = null;
  
  // Extract color from cart item
  if (cartItem && typeof cartItem === 'object' && cartItem.selectedColor) {
    selectedColor = cartItem.selectedColor;
  }
  
  const productSnapshot = {
    quantity: item.quantity,
    productImg: product.productImg,
    productName: product.productName,
    // ... other fields
  };
  
  // Add color to order if it exists
  if (selectedColor) {
    productSnapshot.selectedColor = selectedColor;
  }
  
  return { productId: product.productId, productSnapshot };
});

// Order is created with color included
await Order.create({
  orderId: uuidv7(),
  items: orderItems,  // Contains selectedColor in productSnapshot
  // ... other fields
});
```

### 5. Order History Display
**File**: `client/src/pages/account/MyOrdersPage.jsx`

```javascript
// Color is displayed in order history
{snapshot.selectedColor && (
  <p className="text-gray-500 text-xs mb-1">
    Color: <span className="font-medium">{snapshot.selectedColor}</span>
  </p>
)}
```

### 6. Order Confirmation Email
**File**: `server/src/template/orderConfirmation.template.js`

```javascript
// Color is shown in email
${item.productSnapshot.selectedColor 
  ? `<div style="color: #666; font-size: 12px;">Color: ${item.productSnapshot.selectedColor}</div>` 
  : ''}
```

## API Request/Response Examples

### Add to Cart (with color)
```bash
POST /api/v1/cart/add
{
  "productId": "019cb45b-99c2-76c4-ae22-e85ce7c17b13",
  "productQuanity": 1,
  "selectedColor": "White"  # Color is sent here
}
```

### Get Cart (color returned)
```bash
GET /api/v1/cart
Response:
{
  "data": {
    "availableItems": [
      {
        "productId": "019cb45b-99c2-76c4-ae22-e85ce7c17b13",
        "name": "Ceramic Vase",
        "quantity": 1,
        "selectedColor": "White",  # Color is returned here
        // ... other fields
      }
    ]
  }
}
```

### Create Order (NO color in request - read from cart)
```bash
POST /api/v1/user/create-order
{
  "items": [
    {"productId": "019cb45b-99c2-76c4-ae22-e85ce7c17b13", "quantity": 1}
  ],
  "senderMobile": "6386455111",
  "userEmail": "user@example.com",
  "receiverMobile": "6386455111"
}
# Note: selectedColor is NOT in the request - backend reads it from cart automatically
```

### Get Order History (color in response)
```bash
GET /api/v1/user/order/history
Response:
{
  "data": {
    "orders": [
      {
        "orderId": "ORD123",
        "items": [
          {
            "productId": "019cb45b-99c2-76c4-ae22-e85ce7c17b13",
            "productSnapshot": {
              "productName": "Ceramic Vase",
              "quantity": 1,
              "selectedColor": "White",  # Color is saved in order
              // ... other fields
            }
          }
        ]
      }
    ]
  }
}
```

## Key Points

1. **Color is stored in cart when user adds product** - Not in the create-order request
2. **Backend automatically reads color from cart** - During order creation
3. **Color is saved in order's productSnapshot** - For permanent record
4. **Backward compatible** - Products without colors work normally
5. **Validation happens at cart addition** - Invalid colors are rejected early

## Testing the Flow

### Test 1: Add Product with Color
1. Go to product detail page for a product with colors
2. Select a color (e.g., "White")
3. Click "Add to Cart"
4. Verify: Cart shows "Color: White"

### Test 2: Create Order
1. Go to checkout page
2. Verify: Color is displayed in order summary
3. Click "Place Order"
4. Verify: Order is created successfully
5. Check order history: Color should be displayed

### Test 3: Legacy Product (No Color)
1. Go to product detail page for product without colors
2. Verify: No color selector shown
3. Click "Add to Cart"
4. Verify: Product added without color
5. Create order: Should work normally

## Database Schema

### Cart Model
```javascript
products: {
  type: Map,
  of: mongoose.Schema.Types.Mixed,  // Can be number or object
  default: {},
}

// Example data:
{
  "019cb45b-99c2-76c4-ae22-e85ce7c17b13": { quantity: 1, selectedColor: "White" },
  "019cc7d5-43a9-7c24-a024-e724e6164115": 1  // Legacy format
}
```

### Order Model
```javascript
items: [{
  productId: String,
  productSnapshot: {
    productName: String,
    quantity: Number,
    priceAtPurchase: Number,
    selectedColor: String,  // Optional - only present if color was selected
    // ... other fields
  }
}]
```

## Troubleshooting

### Issue: Order creation fails with 500 error
**Solution**: The fix has been applied to handle `.lean()` conversion of Map to object.

### Issue: Color not showing in order history
**Solution**: Verify that:
1. Color was selected when adding to cart
2. Cart contains the color (check GET /api/v1/cart)
3. Order was created after the fix was applied

### Issue: "Color selection required" error
**Solution**: This is correct behavior - user must select a color for products that have colorOptions.

## Summary

The color selection feature is fully integrated and works automatically:
- ✅ User selects color on product page
- ✅ Color is validated and stored in cart
- ✅ Color is displayed in cart and checkout
- ✅ Color is automatically transferred to order (no need to send in create-order API)
- ✅ Color is displayed in order history and confirmation email
- ✅ Backward compatible with products without colors
