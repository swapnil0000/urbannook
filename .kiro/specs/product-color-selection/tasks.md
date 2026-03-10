# Implementation Plan: Product Color Selection

## Overview

This implementation plan breaks down the product color selection feature into discrete, testable coding tasks. The feature adds color selection functionality to the Urban Nook e-commerce platform while maintaining full backward compatibility with existing products.

The implementation follows a layered approach: backend data models and validation first, then backend services, followed by frontend components, and finally integration and testing.

## Tasks

- [x] 1. Update backend data models and schemas
  - [x] 1.1 Update Product model to include colorOptions in queries
    - Modify `server/src/model/product.model.js`
    - Remove `select: false` from colorOptions field
    - Set default to empty array for backward compatibility
    - _Requirements: 1.4, 7.4, 9.1_
  
  - [x] 1.2 Update Cart model to support color metadata
    - Modify `server/src/model/user.cart.model.js`
    - Change products Map type from `Number` to `mongoose.Schema.Types.Mixed`
    - Support both legacy format (plain number) and new format (object with quantity and selectedColor)
    - _Requirements: 2.5, 3.3, 7.5_
  
  - [x] 1.3 Update Order model to include selectedColor in productSnapshot
    - Modify `server/src/model/order.model.js`
    - Add optional `selectedColor: String` field to items[].productSnapshot
    - _Requirements: 5.2, 6.2, 7.6_

- [ ] 2. Implement backend validation and cart service logic
  - [x] 2.1 Add color validation to cart addition service
    - Modify `server/src/services/user.cart.service.js` - addToCartService function
    - Include colorOptions in product query
    - Validate that selectedColor is required when product has colorOptions
    - Validate that selectedColor exists in product's colorOptions array
    - Return descriptive error messages for validation failures
    - _Requirements: 2.1, 8.1, 8.2, 8.4_
  
  - [x] 2.2 Write property test for color validation
    - **Property 7: Color Validation on Cart Addition**
    - **Validates: Requirements 8.1, 8.2**
    - Create `server/src/__tests__/cart.validation.property.test.js`
    - Use fast-check to generate valid and invalid color combinations
    - Verify valid colors are accepted and invalid colors are rejected
    - Run minimum 100 iterations
  
  - [x] 2.3 Update cart addition to store color metadata
    - Modify `server/src/services/user.cart.service.js` - addToCartService function
    - Store cart value as object `{ quantity: 1, selectedColor }` when color provided
    - Store cart value as plain number for legacy products (backward compatible)
    - _Requirements: 2.5, 3.3, 7.2_
  
  - [ ] 2.4 Write property test for color persistence round trip
    - **Property 6: Color Persistence Round Trip**
    - **Validates: Requirements 2.5, 3.3, 3.4**
    - Create `server/src/__tests__/cart.property.test.js`
    - Use fast-check to generate random color strings
    - Verify selectedColor persists through add and retrieve operations
    - Run minimum 100 iterations
  
  - [x] 2.4 Update cart retrieval aggregation to extract selectedColor
    - Modify `server/src/services/user.cart.service.js` - getCartService function
    - Add $addFields stage to handle both number and object formats
    - Extract quantity from both formats (plain number or object.quantity)
    - Extract selectedColor from object format (null for legacy format)
    - Include selectedColor in projection output
    - _Requirements: 3.4, 9.2_
  
  - [ ] 2.5 Write unit tests for cart service color handling
    - Create `server/src/__tests__/cart.service.test.js`
    - Test adding product with valid color succeeds
    - Test adding product with invalid color fails
    - Test adding product with colors but no selection fails
    - Test adding legacy product without color succeeds
    - Test retrieving cart returns selectedColor for colored items
    - Test retrieving cart handles legacy items without selectedColor
    - _Requirements: 2.1, 2.2, 2.4, 3.4, 7.2, 8.1, 8.2, 8.4_
  
  - [x] 2.6 Update cart quantity service to preserve selectedColor
    - Modify `server/src/services/user.cart.service.js` - cartQuantityService function
    - Handle both number and object cart value formats
    - Preserve selectedColor when updating quantity (add/sub actions)
    - Maintain backward compatibility with legacy cart items
    - _Requirements: 3.3_

- [ ] 3. Update Product API to expose colorOptions
  - [x] 3.1 Update product controller to include colorOptions in response
    - Modify `server/src/controller/product.controller.js` - specificProductDetails function
    - Remove colorOptions from select exclusion list
    - Keep excluding colorOptions from product listing (optional - for performance)
    - _Requirements: 1.4, 9.1_
  
  - [ ] 3.2 Write property test for colorOptions API inclusion
    - **Property 1: Color Options API Inclusion**
    - **Validates: Requirements 1.4, 9.1**
    - Create `server/src/__tests__/product.property.test.js`
    - Use fast-check to generate color arrays
    - Verify colorOptions appears in API response for products with colors
    - Run minimum 100 iterations

- [ ] 4. Checkpoint - Backend validation
  - Ensure all backend tests pass
  - Manually test cart addition with Postman/curl:
    - Add product with valid color → should succeed
    - Add product with invalid color → should fail with error
    - Add product with colors but no selection → should fail with error
    - Add legacy product without color → should succeed
    - Retrieve cart → should include selectedColor field
  - Ask the user if questions arise

- [ ] 5. Update Order service to include selectedColor
  - [x] 5.1 Update order creation to copy selectedColor from cart items
    - Modify order creation logic (likely in `server/src/services/order.service.js` or controller)
    - Map cart items to order items including selectedColor field
    - Ensure selectedColor is copied to productSnapshot
    - _Requirements: 5.1, 5.2_
  
  - [ ] 5.2 Write unit tests for order service color handling
    - Create `server/src/__tests__/order.service.test.js`
    - Test order creation includes selectedColor from cart items
    - Test order creation succeeds for legacy items without selectedColor
    - _Requirements: 5.1, 5.2, 5.4, 7.3_
  
  - [ ] 5.3 Write property test for order creation color transfer
    - **Property 10: Order Creation Color Transfer**
    - **Validates: Requirements 5.1, 5.2**
    - Create `server/src/__tests__/order.property.test.js`
    - Use fast-check to generate cart items with colors
    - Verify selectedColor transfers from cart to order
    - Run minimum 100 iterations
  
  - [x] 5.4 Update order confirmation template to display selectedColor
    - Modify `server/src/template/orderConfirmation.template.js`
    - Add conditional rendering for selectedColor in order items table
    - Display "Color: {selectedColor}" below product name when present
    - _Requirements: 5.3_

- [ ] 6. Create ColorSelector frontend component
  - [x] 6.1 Create ColorSelector component
    - Create `client/src/components/ColorSelector.jsx`
    - Accept props: colors, selectedColor, onColorSelect, disabled
    - Render color buttons with visual selection indicator
    - Apply Urban Nook theme colors (#F5DEB3 for selection, #1c3026 for background)
    - Return null if colors array is empty or undefined
    - _Requirements: 1.1, 1.2, 1.3, 2.3_
  
  - [ ] 6.2 Write unit tests for ColorSelector component
    - Create `client/src/components/__tests__/ColorSelector.test.jsx`
    - Test renders all color options
    - Test calls onColorSelect when color clicked
    - Test highlights selected color
    - Test disabled state prevents selection
    - Test returns null when no colors provided
    - _Requirements: 1.1, 1.2, 1.3, 2.3_

- [ ] 7. Integrate ColorSelector into ProductDetailPage
  - [x] 7.1 Update ProductDetailPage to use ColorSelector
    - Modify `client/src/pages/shop/ProductDetailPage.jsx`
    - Import ColorSelector component
    - Add selectedColor state variable
    - Reset selectedColor when product changes (useEffect with productId dependency)
    - Conditionally render ColorSelector when product.colorOptions exists and has length > 0
    - Pass disabled prop based on product stock status
    - _Requirements: 1.1, 1.2, 2.3_
  
  - [x] 7.2 Add color selection validation to cart addition
    - Modify handleInitialAddToCart function in ProductDetailPage
    - Check if product has colorOptions and selectedColor is null
    - Show error notification "Please select a color" if validation fails
    - Include selectedColor in addToCartAPI call (only if exists)
    - Handle backend validation errors and display error messages
    - _Requirements: 2.1, 2.2, 8.4_
  
  - [ ] 7.3 Write integration tests for ProductDetailPage color selection
    - Create `client/src/pages/shop/__tests__/ProductDetailPage.test.jsx`
    - Test shows color selector for products with colors
    - Test does not show color selector for legacy products
    - Test prevents cart addition without color selection
    - Test allows cart addition with color selection
    - Test displays backend validation errors
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 7.1_

- [x] 8. Update Redux cart slice to handle selectedColor
  - [x] 8.1 Update cartSlice to include selectedColor in cart items
    - Modify `client/src/store/slices/cartSlice.js`
    - Add selectedColor field to cart item mapping in setCartItems reducer
    - Set to null if not present (backward compatible)
    - _Requirements: 3.1, 3.2, 9.2_

- [-] 9. Update cart display to show selectedColor
  - [x] 9.1 Update cart item display to show color
    - Identify cart item rendering location (likely in CheckoutPage or dedicated CartItem component)
    - Add conditional rendering for selectedColor
    - Display "Color: {selectedColor}" when present
    - Use consistent styling with checkout and order history
    - _Requirements: 3.1, 3.2_
  
  - [ ] 9.2 Write property test for cart UI color display
    - **Property 8: Cart UI Color Display**
    - **Validates: Requirements 3.1, 3.2**
    - Create `client/src/__tests__/cart.ui.property.test.jsx`
    - Use fast-check to generate cart items with and without colors
    - Verify UI renders correctly for both cases
    - Run minimum 100 iterations

- [-] 10. Update checkout page to display selectedColor
  - [ ] 10.1 Update checkout order summary to show color
    - Modify `client/src/pages/CheckoutPage.jsx`
    - Add conditional rendering for selectedColor in order items list
    - Display color inline with product name (e.g., "Product Name • White")
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ] 10.2 Write property test for checkout UI color display
    - **Property 9: Checkout UI Color Display**
    - **Validates: Requirements 4.1, 4.2**
    - Create `client/src/__tests__/checkout.ui.property.test.jsx`
    - Use fast-check to generate checkout items with and without colors
    - Verify UI renders correctly for both cases
    - Run minimum 100 iterations

- [ ] 11. Update order history page to display selectedColor
  - [x] 11.1 Update order history item display to show color
    - Modify `client/src/pages/account/MyOrdersPage.jsx`
    - Add conditional rendering for selectedColor in order items
    - Display "Color: {selectedColor}" when present in productSnapshot
    - Use consistent styling with cart and checkout
    - _Requirements: 6.1, 6.2, 9.3_
  
  - [ ] 11.2 Write property test for order history UI color display
    - **Property 14: Order History UI Color Display**
    - **Validates: Requirements 6.1**
    - Create `client/src/__tests__/orderHistory.ui.property.test.jsx`
    - Use fast-check to generate order items with and without colors
    - Verify UI renders correctly for both cases
    - Run minimum 100 iterations

- [ ] 12. Checkpoint - Frontend integration
  - Ensure all frontend tests pass
  - Manually test complete user flow:
    - View product with colors → ColorSelector appears
    - View legacy product → ColorSelector does not appear
    - Try adding product with colors without selection → error shown
    - Select color and add to cart → succeeds
    - View cart → color displayed
    - Proceed to checkout → color displayed
    - Complete order → order confirmation shows color
    - View order history → color displayed
  - Ask the user if questions arise

- [ ] 13. Write end-to-end integration tests
  - [ ] 13.1 Write integration test for complete color selection flow
    - Create `server/src/__tests__/integration/color-selection.integration.test.js`
    - Test complete flow: create product → add to cart with color → retrieve cart → create order → retrieve order history
    - Verify selectedColor persists through entire flow
    - _Requirements: All requirements_
  
  - [ ] 13.2 Write property test for backward compatibility
    - **Property 5: Legacy Product Cart Addition**
    - **Validates: Requirements 2.4, 7.2**
    - **Property 12: Legacy Order Creation**
    - **Validates: Requirements 5.4, 7.3**
    - **Property 16: Optional Field Schema Flexibility**
    - **Validates: Requirements 7.4, 7.5, 7.6**
    - Create `server/src/__tests__/backward-compatibility.property.test.js`
    - Use fast-check to test products with and without colorOptions
    - Verify all operations succeed for legacy products
    - Run minimum 100 iterations

- [ ] 14. Final verification and documentation
  - [ ] 14.1 Run full test suite
    - Execute all backend tests: `cd server && npm test`
    - Execute all frontend tests: `cd client && npm test`
    - Verify all property tests pass (minimum 100 iterations each)
    - Verify test coverage meets goals (90%+ backend, 80%+ frontend)
  
  - [ ] 14.2 Manual testing checklist
    - Test with products that have colorOptions
    - Test with legacy products without colorOptions
    - Test validation errors (invalid color, missing color)
    - Test cart operations (add, update quantity, remove)
    - Test order creation and confirmation
    - Test order history display
    - Test on mobile and desktop viewports
  
  - [ ] 14.3 Final checkpoint
    - Ensure all tests pass
    - Verify no console errors in browser
    - Verify no backend errors in logs
    - Confirm backward compatibility with existing products
    - Ask the user if ready for deployment

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples, edge cases, and error conditions
- The implementation maintains full backward compatibility - no database migration required
- All color-related fields (colorOptions, selectedColor) are optional throughout the system
- The cart model supports both legacy format (plain number) and new format (object with metadata)

## Testing Framework Setup

Before running property-based tests, ensure fast-check is installed:

```bash
cd server
npm install --save-dev fast-check

cd ../client
npm install --save-dev fast-check @testing-library/react @testing-library/jest-dom
```

## Property Tests Summary

The following 17 correctness properties from the design document should be implemented:

1. Property 1: Color Options API Inclusion (Task 3.2)
2. Property 2: Conditional Color Selector Rendering (covered by unit tests in 6.2)
3. Property 3: Color Selection Required (covered by unit tests in 2.5, 7.3)
4. Property 4: Valid Color Selection Enables Cart Addition (covered by unit tests in 2.5)
5. Property 5: Legacy Product Cart Addition (Task 13.2)
6. Property 6: Color Persistence Round Trip (Task 2.4)
7. Property 7: Color Validation on Cart Addition (Task 2.2)
8. Property 8: Cart UI Color Display (Task 9.2)
9. Property 9: Checkout UI Color Display (Task 10.2)
10. Property 10: Order Creation Color Transfer (Task 5.3)
11. Property 11: Order Confirmation Color Display (manual verification)
12. Property 12: Legacy Order Creation (Task 13.2)
13. Property 13: Order History API Color Inclusion (covered by unit tests in 5.2)
14. Property 14: Order History UI Color Display (Task 11.2)
15. Property 15: Legacy Product Rendering (covered by unit tests in 7.3)
16. Property 16: Optional Field Schema Flexibility (Task 13.2)
17. Property 17: Consistent Field Naming (manual verification during code review)
