# Design Document: Product Color Selection

## Overview

This design document specifies the technical implementation for adding color selection functionality to the Urban Nook e-commerce platform. The feature enables customers to select product colors during shopping, with selections persisting through cart, checkout, and order fulfillment.

### Design Goals

- Maintain backward compatibility with products that don't have colors
- Minimize changes to existing API contracts (additive changes only)
- Ensure data consistency across cart, checkout, and order flows
- Provide intuitive UI for color selection
- Support validation to prevent invalid color selections

### Key Design Decisions

1. **Optional Field Strategy**: All color-related fields (colorOptions, selectedColor) are optional throughout the system to maintain backward compatibility
2. **Cart Key Structure**: Keep existing productId-based cart keys; store selectedColor as metadata alongside quantity
3. **Validation Layer**: Implement color validation at the service layer during cart operations
4. **UI Progressive Enhancement**: Color selector only appears when colorOptions exist

## Architecture

### System Components

The color selection feature integrates into the existing three-tier architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ ProductDetail  │  │  CartPage    │  │  CheckoutPage   │ │
│  │    Page        │  │              │  │                 │ │
│  │ ┌────────────┐ │  │              │  │                 │ │
│  │ │ColorSelect │ │  │              │  │                 │ │
│  │ │ Component  │ │  │              │  │                 │ │
│  │ └────────────┘ │  │              │  │                 │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
│           │                  │                   │          │
│           └──────────────────┴───────────────────┘          │
│                              │                               │
│                    ┌─────────▼─────────┐                    │
│                    │   Redux Store     │                    │
│                    │  ┌─────────────┐  │                    │
│                    │  │  cartSlice  │  │                    │
│                    │  │  (updated)  │  │                    │
│                    │  └─────────────┘  │                    │
│                    │  ┌─────────────┐  │                    │
│                    │  │   RTK Query │  │                    │
│                    │  │   API Layer │  │                    │
│                    │  └─────────────┘  │                    │
│                    └───────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/JSON
                              │
┌─────────────────────────────▼─────────────────────────────┐
│                    Backend (Node.js/Express)               │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │   Product    │  │     Cart     │  │     Order       │ │
│  │  Controller  │  │  Controller  │  │   Controller    │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘ │
│         │                  │                    │          │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌────────▼────────┐ │
│  │   Product    │  │     Cart     │  │     Order       │ │
│  │   Service    │  │   Service    │  │    Service      │ │
│  │              │  │  (updated)   │  │   (updated)     │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘ │
│         │                  │                    │          │
│  ┌──────▼──────────────────▼────────────────────▼───────┐ │
│  │              MongoDB (Mongoose)                       │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │ │
│  │  │ Product  │  │   Cart   │  │      Order       │   │ │
│  │  │  Model   │  │  Model   │  │      Model       │   │ │
│  │  │(updated) │  │(updated) │  │    (updated)     │   │ │
│  │  └──────────┘  └──────────┘  └──────────────────┘   │ │
│  └───────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

### Data Flow

#### Color Selection Flow

```
User views product → Product has colorOptions → Display ColorSelector
                                                         │
                                                         ▼
User selects color → Update local state → Enable "Add to Cart"
                                                         │
                                                         ▼
User clicks "Add to Cart" → API call with productId + selectedColor
                                                         │
                                                         ▼
Backend validates color → Check if color in product.colorOptions
                                                         │
                                                         ▼
Valid? → Store in Cart.products Map with metadata structure
                                                         │
                                                         ▼
Cart retrieval → Aggregate products with selectedColor field
                                                         │
                                                         ▼
Display in Cart UI → Show color alongside product info
                                                         │
                                                         ▼
Checkout → Display selectedColor in order summary
                                                         │
                                                         ▼
Order creation → Copy selectedColor to Order.items[].productSnapshot
                                                         │
                                                         ▼
Order history → Display selectedColor in past orders
```

#### Backward Compatibility Flow

```
Legacy Product (no colorOptions) → ColorSelector not rendered
                                                         │
                                                         ▼
User clicks "Add to Cart" → API call with only productId
                                                         │
                                                         ▼
Backend → No color validation → Store without selectedColor
                                                         │
                                                         ▼
Cart/Checkout/Order → Display without color information
```

## Components and Interfaces

### Frontend Components

#### 1. ColorSelector Component

New component for product detail page:

```javascript
// Location: client/src/components/ColorSelector.jsx

interface ColorSelectorProps {
  colors: string[];              // Array of available colors
  selectedColor: string | null;  // Currently selected color
  onColorSelect: (color: string) => void;  // Callback when color selected
  disabled?: boolean;            // Disable selection
}

// Visual Design:
// - Display colors as clickable swatches
// - Show color name on hover
// - Highlight selected color with border/ring
// - Responsive: horizontal scroll on mobile
```

#### 2. Updated ProductDetailPage

Modifications to existing component:

```javascript
// Location: client/src/pages/shop/ProductDetailPage.jsx

// New state:
const [selectedColor, setSelectedColor] = useState(null);

// Conditional rendering:
{product.colorOptions && product.colorOptions.length > 0 && (
  <ColorSelector
    colors={product.colorOptions}
    selectedColor={selectedColor}
    onColorSelect={setSelectedColor}
  />
)}

// Updated add to cart logic:
const handleInitialAddToCart = async () => {
  // Validation: if product has colors, require selection
  if (product.colorOptions?.length > 0 && !selectedColor) {
    showNotification('Please select a color', 'error');
    return;
  }
  
  await addToCartAPI({ 
    productId: product.productId, 
    quantity: 1,
    selectedColor: selectedColor || undefined  // Only include if exists
  }).unwrap();
};
```

#### 3. Cart Display Updates

Modifications to cart item display:

```javascript
// Location: client/src/components/CartItem.jsx (or inline in cart page)

// Display color if present:
{item.selectedColor && (
  <div className="text-sm text-gray-600">
    Color: <span className="font-medium">{item.selectedColor}</span>
  </div>
)}
```

#### 4. Checkout Page Updates

Similar color display in checkout summary:

```javascript
// Location: client/src/pages/CheckoutPage.jsx

// In order items list:
{item.selectedColor && (
  <span className="text-sm text-gray-600">• {item.selectedColor}</span>
)}
```

#### 5. Order History Updates

Display colors in past orders:

```javascript
// Location: client/src/pages/account/MyOrdersPage.jsx

// In order item display:
{item.productSnapshot.selectedColor && (
  <div className="text-xs text-gray-500">
    Color: {item.productSnapshot.selectedColor}
  </div>
)}
```

### Backend API Changes

#### 1. Product API

**GET /api/products/:productId**

Updated response to include colorOptions:

```javascript
// Controller: server/src/controller/product.controller.js
// Modification: Remove colorOptions from select exclusion

// Before:
.select("-_id -createdAt -updatedAt -__v -colorOptions")

// After:
.select("-_id -createdAt -updatedAt -__v")

// Response format:
{
  "statusCode": 200,
  "message": "Product Details",
  "data": {
    "productId": "PROD123",
    "productName": "Ceramic Vase",
    "colorOptions": ["White", "Black", "Terracotta"],  // NEW FIELD
    // ... other fields
  },
  "success": true
}
```

#### 2. Cart API

**POST /api/cart/add**

Updated request body to accept selectedColor:

```javascript
// Controller: server/src/controller/user.cart.controller.js

// Request body:
{
  "productId": "PROD123",
  "productQuanity": 1,
  "selectedColor": "White"  // NEW OPTIONAL FIELD
}

// Service: server/src/services/user.cart.service.js
// Updated addToCartService function
```

**GET /api/cart**

Updated response to include selectedColor:

```javascript
// Response format:
{
  "statusCode": 200,
  "message": "Cart preview fetched",
  "data": {
    "availableItems": [
      {
        "productId": "PROD123",
        "name": "Ceramic Vase",
        "price": 1299,
        "image": "...",
        "quantity": 2,
        "selectedColor": "White",  // NEW FIELD
        "stock": 10,
        "productStatus": "in_stock"
      }
    ],
    "unavailableItems": [],
    "cartSubtotal": 2598,
    "totalQuantity": 2
  },
  "success": true
}
```

**PUT /api/cart/update**

No changes needed - quantity updates don't affect color selection.

#### 3. Order API

**POST /api/orders/create**

Order creation automatically includes selectedColor from cart items.

**GET /api/orders/history**

Updated response includes selectedColor in order items:

```javascript
// Response format:
{
  "statusCode": 200,
  "message": "Orders fetched successfully",
  "data": {
    "totalOrders": 1,
    "orders": [
      {
        "orderId": "ORD123",
        "items": [
          {
            "productId": "PROD123",
            "productSnapshot": {
              "productName": "Ceramic Vase",
              "productImg": "...",
              "quantity": 2,
              "priceAtPurchase": 1299,
              "selectedColor": "White",  // NEW FIELD
              // ... other fields
            }
          }
        ],
        // ... other order fields
      }
    ]
  },
  "success": true
}
```



## Data Models

### Product Model Changes

```javascript
// File: server/src/model/product.model.js

// BEFORE (colorOptions excluded by default):
colorOptions: {
  type: [String],
  select: false,  // Exclude from queries by default
},

// AFTER (colorOptions included in queries):
colorOptions: {
  type: [String],
  default: [],     // Default to empty array
  // Remove select: false to include in queries
},
```

**Migration Strategy**: No database migration needed. Existing products without colorOptions will return empty array or undefined, which is handled gracefully.

### Cart Model Changes

Current cart structure uses a Map for products:

```javascript
// File: server/src/model/user.cart.model.js

// CURRENT STRUCTURE:
products: {
  type: Map,
  of: Number,  // productId -> quantity
  default: {},
}

// PROPOSED STRUCTURE:
products: {
  type: Map,
  of: {
    quantity: { type: Number, required: true, default: 1 },
    selectedColor: { type: String, default: null }
  },
  default: {},
}
```

**Alternative Approach** (Recommended for minimal disruption):

Keep the existing Map structure but use a composite key or metadata approach:

```javascript
// Option A: Composite Key (NOT RECOMMENDED - breaks existing code)
// products: { "PROD123:White": 2, "PROD123:Black": 1 }

// Option B: Nested Object Structure (RECOMMENDED)
products: {
  type: Map,
  of: mongoose.Schema.Types.Mixed,  // Allow flexible structure
  default: {},
}

// Storage format:
// For products WITH color:
// { "PROD123": { quantity: 2, selectedColor: "White" } }

// For products WITHOUT color (backward compatible):
// { "PROD456": 1 }  // Still accepts plain number
// OR
// { "PROD456": { quantity: 1 } }  // Object without selectedColor
```

**Implementation Note**: The service layer will handle both formats:
- If value is a number: legacy format (no color)
- If value is an object: new format (may have selectedColor)

### Order Model Changes

```javascript
// File: server/src/model/order.model.js

items: [
  {
    _id: false,
    productId: {
      type: String,
      required: true,
    },
    productSnapshot: {
      productName: { type: String, required: true },
      productImg: { type: String, required: true },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      productCategory: String,
      productSubCategory: String,
      priceAtPurchase: {
        type: Number,
        required: true,
      },
      shipping: String,
      selectedColor: String,  // NEW FIELD - optional
    },
  },
],
```

**Migration Strategy**: No migration needed. Field is optional and will be undefined for existing orders.

### Data Model Summary

| Model | Field | Type | Required | Default | Notes |
|-------|-------|------|----------|---------|-------|
| Product | colorOptions | [String] | No | [] | Array of available colors |
| Cart | products[productId].selectedColor | String | No | null | Selected color for cart item |
| Cart | products[productId].quantity | Number | Yes | 1 | Quantity (existing) |
| Order | items[].productSnapshot.selectedColor | String | No | undefined | Color at time of purchase |

### Database Indexes

No new indexes required. Existing indexes on productId, userId, and orderId are sufficient.



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, several properties were identified as redundant or overlapping:

- Properties from 7.2, 7.3 are duplicates of 2.4, 5.4 (backward compatibility for cart and orders)
- Properties from 9.1, 9.2, 9.3 are duplicates of 1.4, 3.4, 6.2 (API response inclusion)
- Properties 3.1 and 3.2 can be combined into a single property about cart UI rendering
- Properties 4.1 and 4.2 can be combined into a single property about checkout UI rendering
- Properties 2.1 and 8.4 test the same validation (color required when product has colors)
- Properties 8.1 and 8.2 can be combined into a single validation property

The following properties represent the unique, non-redundant correctness requirements:

### Property 1: Color Options API Inclusion

*For any* product that has colorOptions defined, when the product details API is queried, the response SHALL include the colorOptions field with all available colors.

**Validates: Requirements 1.4, 9.1**

### Property 2: Conditional Color Selector Rendering

*For any* product, the Color_Selector component SHALL be rendered if and only if the product has a non-empty colorOptions array.

**Validates: Requirements 1.1, 1.2**

### Property 3: Color Selection Required for Products with Colors

*For any* product that has colorOptions, attempting to add the product to cart without a selectedColor SHALL be rejected with a descriptive error.

**Validates: Requirements 2.1, 8.4**

### Property 4: Valid Color Selection Enables Cart Addition

*For any* product that has colorOptions, when a valid color from colorOptions is selected, adding the product to cart SHALL succeed.

**Validates: Requirements 2.2**

### Property 5: Legacy Product Cart Addition

*For any* product that does not have colorOptions (or has an empty colorOptions array), adding the product to cart without a selectedColor SHALL succeed.

**Validates: Requirements 2.4, 7.2**

### Property 6: Color Persistence Round Trip

*For any* product with colorOptions and a selected color, adding the product to cart and then retrieving the cart SHALL return the same selectedColor value.

**Validates: Requirements 2.5, 3.3, 3.4**

### Property 7: Color Validation on Cart Addition

*For any* cart addition request that includes a selectedColor, the Cart_Service SHALL verify the selectedColor exists in the product's colorOptions array, and SHALL reject the request with a descriptive error if the color is invalid.

**Validates: Requirements 8.1, 8.2**

### Property 8: Cart UI Color Display

*For any* cart item, the cart UI SHALL display the selectedColor if present, and SHALL display the item without color information if selectedColor is absent.

**Validates: Requirements 3.1, 3.2**

### Property 9: Checkout UI Color Display

*For any* checkout item, the checkout UI SHALL display the selectedColor if present, and SHALL display the item without color information if selectedColor is absent.

**Validates: Requirements 4.1, 4.2**

### Property 10: Order Creation Color Transfer

*For any* order created from cart items, each order item SHALL include the selectedColor from the corresponding cart item if the cart item had a selectedColor.

**Validates: Requirements 5.1, 5.2**

### Property 11: Order Confirmation Color Display

*For any* order confirmation (email/PDF), items with selectedColor SHALL display the color in the confirmation output.

**Validates: Requirements 5.3**

### Property 12: Legacy Order Creation

*For any* order that contains items without selectedColor, the Order_Service SHALL create the order successfully without errors.

**Validates: Requirements 5.4, 7.3**

### Property 13: Order History API Color Inclusion

*For any* order retrieved from order history that has items with selectedColor, the API response SHALL include the selectedColor field for those items.

**Validates: Requirements 6.2, 9.3**

### Property 14: Order History UI Color Display

*For any* order in order history, items with selectedColor SHALL be displayed with the color, and items without selectedColor SHALL be displayed without color information.

**Validates: Requirements 6.1**

### Property 15: Legacy Product Rendering

*For any* product without colorOptions, rendering the Product_Detail_Page SHALL complete without errors.

**Validates: Requirements 7.1**

### Property 16: Optional Field Schema Flexibility

*For any* data model (Product, Cart, Order), creating and retrieving entities with and without color-related fields (colorOptions, selectedColor) SHALL succeed without errors.

**Validates: Requirements 7.4, 7.5, 7.6**

### Property 17: Consistent Field Naming

*For all* API endpoints that return color-related data, the field names SHALL be consistent: "colorOptions" for available colors and "selectedColor" for chosen colors.

**Validates: Requirements 9.4**



## Error Handling

### Validation Errors

#### 1. Color Selection Required

**Scenario**: User attempts to add product with colors but no color selected

```javascript
// Frontend validation (ProductDetailPage.jsx)
if (product.colorOptions?.length > 0 && !selectedColor) {
  showNotification('Please select a color', 'error');
  return; // Prevent API call
}

// Backend validation (user.cart.service.js)
if (productDetails.colorOptions?.length > 0 && !selectedColor) {
  throw new ValidationError(
    'Color selection required for this product',
    { availableColors: productDetails.colorOptions }
  );
}
```

**HTTP Response**: 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Color selection required for this product",
  "data": {
    "availableColors": ["White", "Black", "Terracotta"]
  },
  "success": false
}
```

#### 2. Invalid Color Selection

**Scenario**: User attempts to add product with color not in colorOptions

```javascript
// Backend validation (user.cart.service.js)
if (selectedColor && productDetails.colorOptions?.length > 0) {
  if (!productDetails.colorOptions.includes(selectedColor)) {
    throw new ValidationError(
      `Invalid color selection: ${selectedColor}`,
      { 
        selectedColor,
        availableColors: productDetails.colorOptions 
      }
    );
  }
}
```

**HTTP Response**: 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Invalid color selection: Blue",
  "data": {
    "selectedColor": "Blue",
    "availableColors": ["White", "Black", "Terracotta"]
  },
  "success": false
}
```

#### 3. Product Not Found

**Scenario**: Cart addition with invalid productId

```javascript
// Existing error handling (user.cart.service.js)
if (!productDetails) {
  throw new NotFoundError(`Product not found with ID: ${productId}`);
}
```

**HTTP Response**: 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Product not found with ID: INVALID123",
  "data": null,
  "success": false
}
```

### Data Consistency Errors

#### 4. Cart-Order Color Mismatch

**Scenario**: Product colorOptions changed between cart addition and order creation

**Mitigation Strategy**: 
- Store selectedColor as a snapshot in cart (not validated again at order creation)
- Order creation trusts cart data (color was valid when added)
- Product changes don't invalidate existing cart items

```javascript
// Order creation (order.service.js)
// No re-validation of selectedColor against current product.colorOptions
// Trust the cart data as it was validated at cart addition time
```

#### 5. Missing Product Data

**Scenario**: Product deleted after being added to cart

**Current Handling**: Cart aggregation marks items as unavailable
**Color Handling**: Preserve selectedColor even for unavailable items

```javascript
// Cart aggregation (user.cart.service.js)
// In unavailableItems array:
{
  "productId": "DELETED_PROD",
  "name": null,
  "price": null,
  "selectedColor": "White",  // Preserved from cart data
  "productFound": 0,
  "isEligibleForCalc": false
}
```

### Frontend Error Handling

#### User-Facing Error Messages

```javascript
// ProductDetailPage.jsx
try {
  await addToCartAPI({ 
    productId: product.productId, 
    selectedColor 
  }).unwrap();
  showNotification('Added to cart', 'success');
} catch (err) {
  // Handle specific error types
  if (err.status === 400) {
    showNotification(err.data?.message || 'Invalid selection', 'error');
  } else if (err.status === 404) {
    showNotification('Product not found', 'error');
  } else {
    showNotification('Something went wrong', 'error');
  }
}
```

### Error Recovery

#### Graceful Degradation

1. **Missing colorOptions**: Treat as legacy product (no color selector)
2. **Missing selectedColor in cart**: Display item without color info
3. **Missing selectedColor in order**: Display order without color info
4. **API timeout**: Show retry option, preserve selected color in local state

#### Retry Logic

```javascript
// RTK Query automatic retry for network errors
const apiSlice = createApi({
  // ...
  endpoints: (builder) => ({
    addToCart: builder.mutation({
      query: (body) => ({
        url: '/cart/add',
        method: 'POST',
        body,
      }),
      // Automatic retry on network failure
      extraOptions: { maxRetries: 2 },
    }),
  }),
});
```

### Logging and Monitoring

#### Backend Logging

```javascript
// Log validation failures for monitoring
if (!productDetails.colorOptions.includes(selectedColor)) {
  console.warn(
    `[VALIDATION] Invalid color selection attempt:`,
    { userId, productId, selectedColor, availableColors: productDetails.colorOptions }
  );
  throw new ValidationError(/* ... */);
}
```

#### Frontend Error Tracking

```javascript
// Track errors for analytics
catch (err) {
  console.error('Cart addition failed:', {
    productId: product.productId,
    selectedColor,
    error: err.message,
    timestamp: new Date().toISOString()
  });
  // Send to error tracking service (e.g., Sentry)
}
```



## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests to ensure comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property-based tests**: Verify universal properties across all inputs
- Both approaches are complementary and necessary for complete validation

### Property-Based Testing

#### Framework Selection

**Backend (Node.js)**: Use **fast-check** library
```bash
npm install --save-dev fast-check
```

**Frontend (React)**: Use **fast-check** with React Testing Library
```bash
npm install --save-dev fast-check @testing-library/react @testing-library/jest-dom
```

#### Configuration

Each property test must:
- Run minimum 100 iterations (due to randomization)
- Reference the design document property number
- Use consistent tag format: `Feature: product-color-selection, Property {number}: {property_text}`

#### Property Test Examples

**Property 1: Color Options API Inclusion**

```javascript
// File: server/src/__tests__/product.property.test.js
import fc from 'fast-check';
import Product from '../model/product.model.js';
import { specificProductDetails } from '../controller/product.controller.js';

describe('Feature: product-color-selection, Property 1: Color Options API Inclusion', () => {
  it('should include colorOptions in API response for products with colors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string(), { minLength: 1, maxLength: 5 }), // Generate color arrays
        async (colorOptions) => {
          // Create product with colors
          const product = await Product.create({
            productName: `Test Product ${Date.now()}`,
            productId: `TEST${Date.now()}`,
            colorOptions,
            // ... other required fields
          });

          // Query API
          const response = await specificProductDetails({ 
            params: { productId: product.productId } 
          });

          // Verify colorOptions in response
          expect(response.data.colorOptions).toEqual(colorOptions);

          // Cleanup
          await Product.deleteOne({ productId: product.productId });
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Property 6: Color Persistence Round Trip**

```javascript
// File: server/src/__tests__/cart.property.test.js
import fc from 'fast-check';
import { addToCartService, getCartService } from '../services/user.cart.service.js';

describe('Feature: product-color-selection, Property 6: Color Persistence Round Trip', () => {
  it('should preserve selectedColor through add and retrieve', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // Generate color
        async (selectedColor) => {
          // Setup: Create product with this color
          const product = await createTestProduct({ 
            colorOptions: [selectedColor, 'OtherColor'] 
          });
          const userId = 'test-user-' + Date.now();

          // Add to cart with color
          await addToCartService({ 
            userId, 
            productId: product.productId, 
            selectedColor 
          });

          // Retrieve cart
          const cart = await getCartService({ userId });

          // Verify color preserved
          const cartItem = cart.data.availableItems.find(
            item => item.productId === product.productId
          );
          expect(cartItem.selectedColor).toBe(selectedColor);

          // Cleanup
          await cleanupTestData(userId, product.productId);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Property 7: Color Validation on Cart Addition**

```javascript
// File: server/src/__tests__/cart.validation.property.test.js
import fc from 'fast-check';
import { addToCartService } from '../services/user.cart.service.js';
import { ValidationError } from '../utils/errors.js';

describe('Feature: product-color-selection, Property 7: Color Validation', () => {
  it('should reject invalid colors and accept valid colors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string(), { minLength: 1, maxLength: 5 }), // Valid colors
        fc.string(), // Attempted color
        async (validColors, attemptedColor) => {
          const product = await createTestProduct({ colorOptions: validColors });
          const userId = 'test-user-' + Date.now();

          const isValid = validColors.includes(attemptedColor);

          if (isValid) {
            // Should succeed
            const result = await addToCartService({ 
              userId, 
              productId: product.productId, 
              selectedColor: attemptedColor 
            });
            expect(result.success).toBe(true);
          } else {
            // Should fail
            await expect(
              addToCartService({ 
                userId, 
                productId: product.productId, 
                selectedColor: attemptedColor 
              })
            ).rejects.toThrow(ValidationError);
          }

          await cleanupTestData(userId, product.productId);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing

#### Backend Unit Tests

**Cart Service Tests**

```javascript
// File: server/src/__tests__/cart.service.test.js

describe('Cart Service - Color Selection', () => {
  describe('addToCartService', () => {
    it('should add product with valid color', async () => {
      const product = await createTestProduct({ 
        colorOptions: ['Red', 'Blue'] 
      });
      
      const result = await addToCartService({
        userId: 'test-user',
        productId: product.productId,
        selectedColor: 'Red'
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Added to cart');
    });

    it('should reject product with invalid color', async () => {
      const product = await createTestProduct({ 
        colorOptions: ['Red', 'Blue'] 
      });
      
      await expect(
        addToCartService({
          userId: 'test-user',
          productId: product.productId,
          selectedColor: 'Green' // Invalid
        })
      ).rejects.toThrow('Invalid color selection');
    });

    it('should reject product with colors but no color selected', async () => {
      const product = await createTestProduct({ 
        colorOptions: ['Red', 'Blue'] 
      });
      
      await expect(
        addToCartService({
          userId: 'test-user',
          productId: product.productId,
          // No selectedColor
        })
      ).rejects.toThrow('Color selection required');
    });

    it('should allow legacy product without color', async () => {
      const product = await createTestProduct({ 
        // No colorOptions
      });
      
      const result = await addToCartService({
        userId: 'test-user',
        productId: product.productId,
        // No selectedColor
      });

      expect(result.success).toBe(true);
    });
  });

  describe('getCartService', () => {
    it('should return selectedColor for items with colors', async () => {
      // Setup cart with colored item
      await addToCartService({
        userId: 'test-user',
        productId: 'PROD123',
        selectedColor: 'Red'
      });

      const result = await getCartService({ userId: 'test-user' });

      const item = result.data.availableItems[0];
      expect(item.selectedColor).toBe('Red');
    });

    it('should handle items without selectedColor', async () => {
      // Setup cart with legacy item
      await addToCartService({
        userId: 'test-user',
        productId: 'LEGACY_PROD',
        // No selectedColor
      });

      const result = await getCartService({ userId: 'test-user' });

      const item = result.data.availableItems[0];
      expect(item.selectedColor).toBeUndefined();
    });
  });
});
```

**Order Service Tests**

```javascript
// File: server/src/__tests__/order.service.test.js

describe('Order Service - Color Selection', () => {
  it('should include selectedColor in order items', async () => {
    // Setup cart with colored item
    await setupCartWithColor('test-user', 'PROD123', 'Blue');

    // Create order
    const order = await createOrderFromCart('test-user');

    // Verify color in order
    const orderItem = order.items[0];
    expect(orderItem.productSnapshot.selectedColor).toBe('Blue');
  });

  it('should create order without selectedColor for legacy items', async () => {
    // Setup cart with legacy item
    await setupCartWithoutColor('test-user', 'LEGACY_PROD');

    // Create order
    const order = await createOrderFromCart('test-user');

    // Verify order created successfully
    expect(order.status).toBe('CREATED');
    expect(order.items[0].productSnapshot.selectedColor).toBeUndefined();
  });
});
```

#### Frontend Unit Tests

**ColorSelector Component Tests**

```javascript
// File: client/src/components/__tests__/ColorSelector.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import ColorSelector from '../ColorSelector';

describe('ColorSelector Component', () => {
  it('should render all color options', () => {
    const colors = ['Red', 'Blue', 'Green'];
    render(
      <ColorSelector 
        colors={colors} 
        selectedColor={null} 
        onColorSelect={jest.fn()} 
      />
    );

    colors.forEach(color => {
      expect(screen.getByText(color)).toBeInTheDocument();
    });
  });

  it('should call onColorSelect when color clicked', () => {
    const onColorSelect = jest.fn();
    render(
      <ColorSelector 
        colors={['Red', 'Blue']} 
        selectedColor={null} 
        onColorSelect={onColorSelect} 
      />
    );

    fireEvent.click(screen.getByText('Red'));
    expect(onColorSelect).toHaveBeenCalledWith('Red');
  });

  it('should highlight selected color', () => {
    render(
      <ColorSelector 
        colors={['Red', 'Blue']} 
        selectedColor="Red" 
        onColorSelect={jest.fn()} 
      />
    );

    const redButton = screen.getByText('Red').closest('button');
    expect(redButton).toHaveClass('selected'); // Or whatever class indicates selection
  });
});
```

**ProductDetailPage Integration Tests**

```javascript
// File: client/src/pages/shop/__tests__/ProductDetailPage.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import ProductDetailPage from '../ProductDetailPage';

describe('ProductDetailPage - Color Selection', () => {
  it('should show color selector for products with colors', () => {
    const productWithColors = {
      productId: 'PROD123',
      productName: 'Vase',
      colorOptions: ['White', 'Black'],
      // ... other fields
    };

    render(
      <Provider store={mockStore}>
        <ProductDetailPage product={productWithColors} />
      </Provider>
    );

    expect(screen.getByText('White')).toBeInTheDocument();
    expect(screen.getByText('Black')).toBeInTheDocument();
  });

  it('should not show color selector for legacy products', () => {
    const legacyProduct = {
      productId: 'LEGACY',
      productName: 'Old Vase',
      // No colorOptions
    };

    render(
      <Provider store={mockStore}>
        <ProductDetailPage product={legacyProduct} />
      </Provider>
    );

    expect(screen.queryByTestId('color-selector')).not.toBeInTheDocument();
  });

  it('should prevent cart addition without color selection', async () => {
    const productWithColors = {
      productId: 'PROD123',
      colorOptions: ['White', 'Black'],
    };

    render(
      <Provider store={mockStore}>
        <ProductDetailPage product={productWithColors} />
      </Provider>
    );

    fireEvent.click(screen.getByText('Add to Cart'));

    await waitFor(() => {
      expect(screen.getByText('Please select a color')).toBeInTheDocument();
    });
  });

  it('should allow cart addition with color selection', async () => {
    const productWithColors = {
      productId: 'PROD123',
      colorOptions: ['White', 'Black'],
    };

    const mockAddToCart = jest.fn().mockResolvedValue({ success: true });

    render(
      <Provider store={mockStore}>
        <ProductDetailPage 
          product={productWithColors} 
          addToCart={mockAddToCart}
        />
      </Provider>
    );

    // Select color
    fireEvent.click(screen.getByText('White'));

    // Add to cart
    fireEvent.click(screen.getByText('Add to Cart'));

    await waitFor(() => {
      expect(mockAddToCart).toHaveBeenCalledWith({
        productId: 'PROD123',
        quantity: 1,
        selectedColor: 'White'
      });
    });
  });
});
```

### Integration Tests

```javascript
// File: server/src/__tests__/integration/color-selection.integration.test.js

describe('Color Selection - End-to-End Integration', () => {
  it('should handle complete flow: product -> cart -> order', async () => {
    // 1. Create product with colors
    const product = await Product.create({
      productName: 'Test Vase',
      productId: 'TEST_VASE',
      colorOptions: ['White', 'Black', 'Terracotta'],
      // ... other fields
    });

    // 2. Add to cart with color
    const cartResult = await addToCartService({
      userId: 'integration-test-user',
      productId: 'TEST_VASE',
      selectedColor: 'Terracotta'
    });
    expect(cartResult.success).toBe(true);

    // 3. Retrieve cart and verify color
    const cart = await getCartService({ userId: 'integration-test-user' });
    const cartItem = cart.data.availableItems[0];
    expect(cartItem.selectedColor).toBe('Terracotta');

    // 4. Create order from cart
    const order = await createOrderFromCart('integration-test-user');
    expect(order.items[0].productSnapshot.selectedColor).toBe('Terracotta');

    // 5. Retrieve order history and verify color
    const orderHistory = await getOrderHistory('integration-test-user');
    const historicalItem = orderHistory.orders[0].items[0];
    expect(historicalItem.productSnapshot.selectedColor).toBe('Terracotta');

    // Cleanup
    await cleanupIntegrationTest('integration-test-user', 'TEST_VASE');
  });
});
```

### Test Coverage Goals

- **Backend Services**: 90%+ line coverage
- **Frontend Components**: 80%+ line coverage
- **Property Tests**: All 17 properties implemented
- **Unit Tests**: All edge cases and error conditions covered
- **Integration Tests**: Complete user flows validated

### Running Tests

```bash
# Backend tests
cd server
npm test                          # Run all tests
npm test -- --coverage            # With coverage report
npm test cart.property.test.js    # Run specific property tests

# Frontend tests
cd client
npm test                          # Run all tests
npm test -- --coverage            # With coverage report
npm test ColorSelector.test.jsx   # Run specific component tests
```



## Implementation Details

### Backend Implementation

#### 1. Product Model Update

```javascript
// File: server/src/model/product.model.js

// Change from:
colorOptions: {
  type: [String],
  select: false,  // REMOVE THIS LINE
},

// To:
colorOptions: {
  type: [String],
  default: [],
},
```

#### 2. Product Controller Update

```javascript
// File: server/src/controller/product.controller.js

// In specificProductDetails function:
// Change from:
.select("-_id -createdAt -updatedAt -__v -colorOptions")

// To:
.select("-_id -createdAt -updatedAt -__v")

// In productListing function (optional - for list views):
// Keep excluding colorOptions to reduce payload size
.select("-_id -createdAt -updatedAt -__v -colorOptions")
```

#### 3. Cart Model Update

```javascript
// File: server/src/model/user.cart.model.js

// Change from:
products: {
  type: Map,
  of: Number,
  default: {},
},

// To:
products: {
  type: Map,
  of: mongoose.Schema.Types.Mixed,  // Allow both Number and Object
  default: {},
},
```

#### 4. Cart Service Update

```javascript
// File: server/src/services/user.cart.service.js

// Update addToCartService function:
const addToCartService = async ({ userId, productId, selectedColor }) => {
  // Existing validation...
  
  const productDetails = await Product.findOne(
    { productId },
    { productName: 1, colorOptions: 1 }  // Include colorOptions
  ).lean();

  if (!productDetails) {
    throw new NotFoundError(`Product not found with ${productId}`);
  }

  // NEW: Color validation
  if (productDetails.colorOptions?.length > 0) {
    if (!selectedColor) {
      throw new ValidationError(
        'Color selection required for this product',
        { availableColors: productDetails.colorOptions }
      );
    }
    
    if (!productDetails.colorOptions.includes(selectedColor)) {
      throw new ValidationError(
        `Invalid color selection: ${selectedColor}`,
        { 
          selectedColor,
          availableColors: productDetails.colorOptions 
        }
      );
    }
  }

  // Check if already in cart
  const key = `products.${productId}`;
  const cart = await Cart.findOne({
    userId,
    [key]: { $exists: true },
  }).lean();

  if (cart) {
    return {
      statusCode: 200,
      message: "Already in cart",
      data: `User - ${userDetails.name}, Product - ${productDetails.productName}`,
      success: true,
    };
  }

  // NEW: Store with color metadata
  const cartValue = selectedColor 
    ? { quantity: 1, selectedColor }
    : 1;  // Backward compatible: plain number for legacy products

  await Cart.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: { userId },
      $set: { [key]: cartValue },
    },
    { upsert: true },
  );

  return {
    statusCode: 200,
    message: `Added to cart`,
    data: `User - ${userDetails?.name} and Product Name: ${productDetails.productName}`,
    success: true,
  };
};

// Update getCartService function:
const getCartService = async ({ userId }) => {
  if (!userId) {
    throw new AuthenticationError("Unauthorized");
  }

  const cartData = await Cart.aggregate([
    { $match: { userId } },
    { $project: { items: { $objectToArray: "$products" } } },
    { $unwind: "$items" },
    {
      $addFields: {
        // Handle both formats: plain number or object with quantity
        quantity: {
          $cond: {
            if: { $eq: [{ $type: "$items.v" }, "number"] },
            then: "$items.v",  // Legacy format: plain number
            else: "$items.v.quantity"  // New format: object.quantity
          }
        },
        selectedColor: {
          $cond: {
            if: { $eq: [{ $type: "$items.v" }, "object"] },
            then: "$items.v.selectedColor",  // Extract selectedColor if object
            else: null  // No color for legacy format
          }
        }
      }
    },
    {
      $lookup: {
        from: "products",
        localField: "items.k",
        foreignField: "productId",
        as: "product",
      },
    },
    {
      $addFields: {
        productFound: { $size: "$product" },
      },
    },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        productId: "$product.productId",
        name: "$product.productName",
        price: "$product.sellingPrice",
        image: "$product.productImg",
        quantity: 1,  // From addFields above
        selectedColor: 1,  // From addFields above
        stock: "$product.productQuantity",
        productStatus: "$product.productStatus",
        productFound: 1,
        isEligibleForCalc: {
          $cond: {
            if: { $gt: ["$productFound", 0] },
            then: {
              $and: [
                { $eq: ["$product.productStatus", "in_stock"] },
                { $gt: ["$product.productQuantity", 0] },
              ],
            },
            else: false,
          },
        },
      },
    },
    // Rest of aggregation pipeline remains the same...
  ]);

  // Return format unchanged, now includes selectedColor field
  return {
    statusCode: 200,
    message: cartData.length === 0 ? "Cart is empty" : "Cart preview fetched",
    data: cartData[0] || {
      availableItems: [],
      unavailableItems: [],
      cartSubtotal: 0,
      totalQuantity: 0,
    },
    success: true,
  };
};

// Update cartQuantityService function:
const cartQuantityService = async ({ userId, productId, quantity, action }) => {
  // Existing validation...

  const productQuanityMap = cartDetails.products;
  const cartValue = productQuanityMap.get(String(productId));

  if (!cartValue) {
    throw new ValidationError("Product not in cart");
  }

  // Handle both formats
  const currentQuantity = typeof cartValue === 'number' 
    ? cartValue 
    : cartValue.quantity;
  
  const selectedColor = typeof cartValue === 'object' 
    ? cartValue.selectedColor 
    : null;

  switch (action) {
    case "add":
      const newAddValue = selectedColor
        ? { quantity: currentQuantity + quantity, selectedColor }
        : currentQuantity + quantity;
      productQuanityMap.set(productId, newAddValue);
      break;
      
    case "sub":
      if (currentQuantity <= quantity) {
        throw new ValidationError("Cannot reduce below 1. Use remove instead.");
      }
      const newSubValue = selectedColor
        ? { quantity: currentQuantity - quantity, selectedColor }
        : currentQuantity - quantity;
      productQuanityMap.set(productId, newSubValue);
      break;
      
    case "remove":
      productQuanityMap.delete(productId);
      break;
      
    default:
      throw new ValidationError("Invalid action");
  }

  await cartDetails.save();

  // Existing coupon recalculation logic...

  return {
    statusCode: 200,
    message: `Cart quantity updated successfully`,
    success: true,
  };
};
```

#### 5. Order Model Update

```javascript
// File: server/src/model/order.model.js

// In items array schema:
productSnapshot: {
  productName: { type: String, required: true },
  productImg: { type: String, required: true },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  productCategory: String,
  productSubCategory: String,
  priceAtPurchase: {
    type: Number,
    required: true,
  },
  shipping: String,
  selectedColor: String,  // ADD THIS LINE
},
```

#### 6. Order Service Update

```javascript
// File: server/src/services/order.service.js (or wherever order creation happens)

// In order creation from cart:
const createOrderFromCart = async (userId) => {
  const cart = await getCartService({ userId });
  
  const orderItems = cart.data.availableItems.map(item => ({
    productId: item.productId,
    productSnapshot: {
      productName: item.name,
      productImg: item.image,
      quantity: item.quantity,
      priceAtPurchase: item.price,
      productCategory: item.productCategory,
      productSubCategory: item.productSubCategory,
      selectedColor: item.selectedColor,  // ADD THIS LINE
    }
  }));

  // Create order with items...
};
```

#### 7. Order Confirmation Template Update

```javascript
// File: server/src/template/orderConfirmation.template.js

// In order items rendering:
${order.items.map((item) => {
  const s = item.productSnapshot;
  return `
    <tr class="border-b">
      <td class="p-4">
        ${s.productName}
        ${s.selectedColor ? `<br/><span class="text-sm text-gray-600">Color: ${s.selectedColor}</span>` : ''}
      </td>
      <td class="p-4 text-center">${s.quantity}</td>
      <td class="p-4 text-center">₹${s.priceAtPurchase}</td>
      <td class="p-4 text-center">₹${s.quantity * s.priceAtPurchase}</td>
    </tr>
  `;
}).join("")}
```

### Frontend Implementation

#### 1. Create ColorSelector Component

```javascript
// File: client/src/components/ColorSelector.jsx

import React from 'react';

const ColorSelector = ({ colors, selectedColor, onColorSelect, disabled = false }) => {
  if (!colors || colors.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-300 mb-3">
        Select Color
      </label>
      <div className="flex flex-wrap gap-3">
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => onColorSelect(color)}
            disabled={disabled}
            className={`
              px-4 py-2 rounded-full border-2 transition-all
              ${selectedColor === color
                ? 'border-[#F5DEB3] bg-[#F5DEB3] text-[#1c3026] font-bold'
                : 'border-[#F5DEB3]/30 text-[#F5DEB3] hover:border-[#F5DEB3] hover:bg-[#F5DEB3]/10'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {color}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ColorSelector;
```

#### 2. Update ProductDetailPage

```javascript
// File: client/src/pages/shop/ProductDetailPage.jsx

import ColorSelector from '../../components/ColorSelector';

const ProductDetailPage = () => {
  // Existing code...
  
  // NEW: Add state for selected color
  const [selectedColor, setSelectedColor] = useState(null);

  // NEW: Reset selected color when product changes
  useEffect(() => {
    setSelectedColor(null);
  }, [productId]);

  // UPDATE: handleInitialAddToCart function
  const handleInitialAddToCart = async () => {
    if (!product) return;
    
    const hasToken = !!localStorage.getItem('authToken');
    const isLoggedIn = isAuthenticated || hasToken;

    if (!isLoggedIn) {
      openLoginModal();
      return;
    }

    // NEW: Validate color selection
    if (product.colorOptions?.length > 0 && !selectedColor) {
      showNotification('Please select a color', 'error');
      return;
    }

    try {
      await addToCartAPI({ 
        productId: product?.productId, 
        quantity: 1,
        selectedColor: selectedColor || undefined  // Only include if exists
      }).unwrap();
      
      await refetchCart();
      
      setFeedbackMessage("Added");
      setTimeout(() => setFeedbackMessage(""), 2000);
    } catch (err) {
      console.error('Add to cart failed:', err);
      showNotification(err.data?.message || "Something went wrong", 'error');
    }
  };

  // In JSX, add ColorSelector before action buttons:
  return (
    <div className="bg-[#2e443c] min-h-screen">
      {/* Existing code... */}
      
      <div className="lg:col-span-5 flex flex-col">
        {/* Product info... */}
        
        {/* NEW: Color Selector */}
        {product.colorOptions && product.colorOptions.length > 0 && (
          <ColorSelector
            colors={product.colorOptions}
            selectedColor={selectedColor}
            onColorSelect={setSelectedColor}
            disabled={product.productStatus !== 'in_stock'}
          />
        )}

        {/* Action buttons... */}
      </div>
    </div>
  );
};
```

#### 3. Update Redux Cart Slice

```javascript
// File: client/src/store/slices/cartSlice.js

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setCartItems: (state, action) => {
      const cartData = action.payload || [];
      
      let cartItems = [];
      
      if (Array.isArray(cartData)) {
        if (cartData.length > 0 && cartData[0]?.items) {
          cartItems = cartData[0].items;
        } else {
          cartItems = cartData;
        }
      } else if (cartData && typeof cartData === 'object') {
        if (cartData.availableItems && Array.isArray(cartData.availableItems)) {
          cartItems = cartData.availableItems;
        } else if (cartData.items && Array.isArray(cartData.items)) {
          cartItems = cartData.items;
        } else if (cartData.data && Array.isArray(cartData.data)) {
          cartItems = cartData.data;
        }
      }
      
      if (!Array.isArray(cartItems)) {
        cartItems = [];
      }
      
      state.items = cartItems.map(item => ({
        id: item.productId || item._id,
        mongoId: item.productId || item._id,
        name: item.name || item.productName,
        price: item.price || item.productPrice || item.sellingPrice,
        image: item.image || item.productImage || item.productImg,
        quantity: item.quantity || 1,
        selectedColor: item.selectedColor || null,  // ADD THIS LINE
      }));
      
      state.totalQuantity = state.items.reduce((total, item) => total + item.quantity, 0);
      state.totalAmount = state.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    },
    // Other reducers...
  },
});
```

#### 4. Update Cart Display

```javascript
// File: client/src/pages/CheckoutPage.jsx (or wherever cart items are displayed)

// In cart item rendering:
{cartItems.map((item) => (
  <div key={item.id} className="cart-item">
    <img src={item.image} alt={item.name} />
    <div>
      <h3>{item.name}</h3>
      {/* NEW: Display selected color */}
      {item.selectedColor && (
        <p className="text-sm text-gray-600">
          Color: <span className="font-medium">{item.selectedColor}</span>
        </p>
      )}
      <p>₹{item.price}</p>
    </div>
    <div>Qty: {item.quantity}</div>
  </div>
))}
```

#### 5. Update Checkout Page

```javascript
// File: client/src/pages/CheckoutPage.jsx

// In order summary:
{cartItems.map((item) => (
  <div key={item.id} className="flex justify-between">
    <div>
      <span>{item.name}</span>
      {/* NEW: Display color in checkout */}
      {item.selectedColor && (
        <span className="text-sm text-gray-500"> • {item.selectedColor}</span>
      )}
      <span className="text-sm"> × {item.quantity}</span>
    </div>
    <span>₹{item.price * item.quantity}</span>
  </div>
))}
```

#### 6. Update Order History Page

```javascript
// File: client/src/pages/account/MyOrdersPage.jsx

// In order items display:
{order.items.map((item) => (
  <div key={item.productId} className="order-item">
    <img src={item.productSnapshot.productImg} alt={item.productSnapshot.productName} />
    <div>
      <h4>{item.productSnapshot.productName}</h4>
      {/* NEW: Display color in order history */}
      {item.productSnapshot.selectedColor && (
        <p className="text-xs text-gray-500">
          Color: {item.productSnapshot.selectedColor}
        </p>
      )}
      <p>Qty: {item.productSnapshot.quantity}</p>
      <p>₹{item.productSnapshot.priceAtPurchase}</p>
    </div>
  </div>
))}
```

### API Endpoint Updates

#### Updated Request/Response Formats

**POST /api/cart/add**
```javascript
// Request
{
  "productId": "PROD123",
  "productQuanity": 1,
  "selectedColor": "White"  // NEW - optional
}

// Response (unchanged)
{
  "statusCode": 200,
  "message": "Added to cart",
  "data": "...",
  "success": true
}
```

**GET /api/cart**
```javascript
// Response
{
  "statusCode": 200,
  "message": "Cart preview fetched",
  "data": {
    "availableItems": [
      {
        "productId": "PROD123",
        "name": "Ceramic Vase",
        "price": 1299,
        "image": "...",
        "quantity": 2,
        "selectedColor": "White",  // NEW - optional
        "stock": 10,
        "productStatus": "in_stock"
      }
    ],
    "unavailableItems": [],
    "cartSubtotal": 2598,
    "totalQuantity": 2
  },
  "success": true
}
```

**GET /api/products/:productId**
```javascript
// Response
{
  "statusCode": 200,
  "message": "Product Details",
  "data": {
    "productId": "PROD123",
    "productName": "Ceramic Vase",
    "colorOptions": ["White", "Black", "Terracotta"],  // NEW - optional
    "sellingPrice": 1299,
    // ... other fields
  },
  "success": true
}
```



## Deployment and Migration

### Database Migration

No database migration is required because all new fields are optional:

- `Product.colorOptions`: Already exists in schema (just changing select behavior)
- `Cart.products`: Map accepts Mixed type, backward compatible with existing Number values
- `Order.items[].productSnapshot.selectedColor`: Optional field, undefined for existing orders

### Deployment Strategy

#### Phase 1: Backend Deployment

1. Deploy updated backend code with new validation logic
2. Existing products without `colorOptions` continue to work
3. Existing cart items (plain numbers) continue to work
4. New cart additions can include `selectedColor`

#### Phase 2: Frontend Deployment

1. Deploy updated frontend with ColorSelector component
2. Products with `colorOptions` show color selector
3. Products without `colorOptions` work as before
4. Cart/checkout/order history display colors when present

#### Phase 3: Data Population (Optional)

1. Admin interface to add `colorOptions` to existing products
2. Gradual rollout: add colors to new products first
3. Backfill colors for popular products
4. Monitor analytics to prioritize which products need colors

### Rollback Plan

If issues arise, rollback is safe:

1. **Backend rollback**: Revert to previous version
   - Existing cart items with colors will still work (stored as objects)
   - New additions won't validate colors, but won't break
   
2. **Frontend rollback**: Revert to previous version
   - ColorSelector won't render
   - Cart/checkout/orders won't display colors
   - Functionality remains intact

3. **Data cleanup** (if needed):
   - Cart items with `selectedColor` can be converted back to plain numbers
   - Or left as-is (backward compatible)

### Monitoring

#### Metrics to Track

1. **Color selection rate**: % of products with colors that get a color selected
2. **Validation errors**: Track "color required" and "invalid color" errors
3. **Cart abandonment**: Monitor if color selection affects cart abandonment
4. **Order completion**: Ensure orders with colors complete successfully
5. **API performance**: Monitor cart/order query performance with new fields

#### Alerts

```javascript
// Example monitoring setup
if (colorValidationErrors > threshold) {
  alert('High color validation error rate - check product data');
}

if (cartAdditionFailures > threshold) {
  alert('Cart addition failures spiking - investigate color validation');
}
```

### Performance Considerations

#### Database Queries

- **Product queries**: No performance impact (colorOptions is small array)
- **Cart aggregation**: Minimal impact (added $cond for format handling)
- **Order queries**: No impact (selectedColor is simple string field)

#### Frontend Bundle Size

- **ColorSelector component**: ~2KB (minimal)
- **Redux slice updates**: No size increase
- **Total impact**: <5KB additional bundle size

#### Caching

- Product details with colorOptions can be cached (rarely change)
- Cart data should not be cached (user-specific, changes frequently)
- Order history can be cached with standard TTL

### Security Considerations

#### Input Validation

- **Color selection**: Validated against product's colorOptions array
- **SQL injection**: Not applicable (MongoDB, using Mongoose)
- **XSS**: Color values are strings, properly escaped in React

#### Authorization

- Users can only add colors to their own cart
- Existing auth middleware handles user verification
- No new authorization logic needed

### Backward Compatibility Checklist

- [x] Products without colorOptions work as before
- [x] Cart items without selectedColor work as before
- [x] Orders without selectedColor work as before
- [x] Existing API contracts maintained (additive changes only)
- [x] Frontend gracefully handles missing color data
- [x] Backend handles both old and new cart data formats
- [x] No breaking changes to existing functionality

## Future Enhancements

### Potential Improvements

1. **Color Swatches**: Display actual color swatches instead of text
   - Store hex codes or image URLs for colors
   - Visual color picker UI

2. **Color-Specific Inventory**: Track stock per color
   - Separate inventory counts for each color variant
   - Show "Out of stock" for specific colors

3. **Color-Specific Pricing**: Different prices for different colors
   - Premium colors cost more
   - Sale prices per color

4. **Color Images**: Show product image for selected color
   - Multiple image sets per product
   - Switch images when color selected

5. **Color Filters**: Filter products by color in search/browse
   - "Show all red products"
   - Color facets in search results

6. **Color Recommendations**: Suggest popular colors
   - "Most popular color: White"
   - "Customers also liked: Black"

7. **Multi-Color Products**: Products with multiple color selections
   - "Select primary and accent colors"
   - Combination validation

8. **Color Customization**: Custom color requests
   - "Request custom color" option
   - Admin approval workflow

### Technical Debt

None introduced by this feature. The implementation follows existing patterns and maintains backward compatibility.

## Conclusion

This design provides a comprehensive, backward-compatible solution for adding color selection to the Urban Nook e-commerce platform. The implementation:

- Maintains all existing functionality
- Adds minimal complexity to the codebase
- Follows established patterns and conventions
- Includes robust validation and error handling
- Provides comprehensive test coverage
- Supports future enhancements

The feature can be deployed incrementally with zero downtime and no data migration required.

