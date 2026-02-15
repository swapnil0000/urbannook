# Implementation Plan: Production Readiness Fixes

## Overview

This implementation plan addresses critical bugs, security vulnerabilities, missing features, and code quality improvements to make the UrbanNook e-commerce website production-ready. The plan follows an incremental approach, fixing blocking issues first, then adding features, and finally optimizing performance and code quality.

## Tasks

- [x] 1. Fix Critical Blocking Bugs
  - [x] 1.1 Fix API route mismatch for clear cart endpoint
    - Update `client/src/store/api/userApi.js` to use `/user/cart/clear` instead of `/user/clear-cart`
    - Verify client calls match server routes
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 1.2 Fix Cart Service success flag bug
    - Update `server/src/services/user.cart.service.js` line 221 to return `success: true` instead of `false`
    - _Requirements: 2.1_
  
  - [x] 1.3 Fix User Controller JWT import
    - Add `import jwt from 'jsonwebtoken';` to `server/src/controller/user.controller.js`
    - Verify `userAccountDeletePreview` function works correctly
    - _Requirements: 3.1, 3.2_
  
  - [x] 1.4 Fix Razorpay webhook signature verification
    - Update `server/src/controller/rp.payment.controller.js` to use raw body for signature verification
    - Fix inverted verification logic (success should mean success)
    - Test webhook with valid and invalid signatures
    - _Requirements: 4.1, 4.2, 4.3, 4.6_

- [x] 2. Implement Security Enhancements
  - [x] 2.1 Create OTP model and service
    - Create `server/src/model/otp.model.js` with email, otp, expiresAt, attempts, lockedUntil fields
    - Create `server/src/services/otp.service.js` with generateOTP, verifyOTP, lockAccount, isLocked methods
    - Add TTL index on expiresAt field
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [ ]* 2.2 Write unit tests for OTP service
    - Test OTP generation and expiration
    - Test OTP verification success and failure
    - Test account locking after 3 failed attempts
    - Test OTP invalidation after successful use
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [x] 2.3 Implement forgot password with OTP
    - Create POST `/user/forgot-password/request` endpoint to generate and send OTP
    - Create POST `/user/forgot-password/reset` endpoint to verify OTP and reset password
    - Update `server/src/controller/user.controller.js` with new endpoints
    - Integrate with email service to send OTP
    - _Requirements: 5.1, 5.2, 5.6_
  
  - [x] 2.4 Implement environment variable validation
    - Create `server/src/config/validateEnv.js` with validation function
    - Add validation call in `server/src/server.js` before server startup
    - Create `.env.example` with placeholder values
    - Remove `.env` from repository (add to .gitignore)
    - _Requirements: 6.1, 6.3, 6.4, 6.5_
  
  - [x] 2.5 Implement CORS whitelist configuration
    - Create `server/src/config/cors.config.js` with environment-based whitelist
    - Update `server/src/app.js` to use CORS configuration
    - Test CORS with whitelisted and non-whitelisted origins
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [x] 2.6 Implement input validation middleware
    - Install Joi validation library
    - Create `server/src/middleware/validation.middleware.js`
    - Create validation schemas in `server/src/validation/` directory
    - Add validation to user registration, login, and profile update endpoints
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 19.1, 19.2, 19.3_
  
  - [x] 2.7 Write property tests for input validation
    - **Property 5: Input Validation**
    - **Validates: Requirements 15.1, 15.5, 19.1**
    - **Property 6: Email Format Validation**
    - **Validates: Requirements 15.2**
    - **Property 7: Phone Number Format Validation**
    - **Validates: Requirements 15.3**
    - **Property 8: Price Validation**
    - **Validates: Requirements 15.4**
    - **Property 11: Input Sanitization**
    - **Validates: Requirements 19.2**
    - **Property 12: Numeric Range Validation**
    - **Validates: Requirements 19.3**

- [x] 3. Checkpoint - Verify security fixes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Coupon Feature (Frontend)
  - [x] 4.1 Create coupon API endpoints in Redux
    - Add applyCoupon, removeCoupon, getAvailableCoupons to `client/src/store/api/userApi.js`
    - _Requirements: 8.1, 9.2, 9.5_
  
  - [x] 4.2 Create CouponInput component
    - Create `client/src/components/CouponInput.jsx` with input field, apply button, error/success messages
    - Handle coupon application and removal
    - Display applied discount
    - _Requirements: 8.1, 9.1, 9.3, 9.4, 9.5_
  
  - [x] 4.3 Create CouponList component
    - Create `client/src/components/CouponList.jsx` to display available coupons
    - Show coupon details (name, discount type, value, min cart requirement)
    - Add click-to-apply functionality
    - _Requirements: 9.2, 9.6_
  
  - [x] 4.4 Integrate coupon components into CheckoutPage
    - Add CouponInput component to `client/src/pages/CheckoutPage.jsx`
    - Update order summary to show discount breakdown
    - Display: Subtotal, Discount (COUPON_CODE), Shipping, Total
    - _Requirements: 9.1, 9.3, 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [x] 4.5 Write unit tests for coupon components
    - Test CouponInput rendering and interaction
    - Test coupon application success and error states
    - Test coupon removal
    - Test order summary updates with discount
    - _Requirements: 8.1, 9.1, 9.3, 9.4, 9.5, 10.1_
  
  - [x] 4.6 Write property tests for coupon calculation
    - **Property 2: Coupon Discount Calculation**
    - **Validates: Requirements 8.2, 8.4, 8.5**
    - **Property 3: Coupon Validation Errors**
    - **Validates: Requirements 8.3**

- [x] 5. Implement Email Notification System
  - [x] 5.1 Enhance email service
    - Update `server/src/services/email.service.js` with new email methods
    - Add sendOrderConfirmation, sendPaymentReceipt, sendOTP, sendWelcomeEmail, sendOrderStatusUpdate
    - Implement retry logic with 3 attempts
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.6_
  
  - [x] 5.2 Create email templates
    - Create HTML templates in `server/src/template/` for each email type
    - Use Urban Nook branding and mobile-responsive design
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [x] 5.3 Integrate email notifications into workflows
    - Send order confirmation email after order creation
    - Send payment receipt after successful payment
    - Send OTP email during password reset
    - Send welcome email after user registration
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [x] 5.4 Write unit tests for email service
    - Test email sending for each type
    - Test retry logic on failure
    - Test email template rendering
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.6_

- [-] 6. Implement Payment Failure Handling
  - [x] 6.1 Add payment error codes and messages
    - Create error code mapping in `server/src/controller/rp.payment.controller.js`
    - Update payment verification to return specific error codes
    - Update Order model to store errorCode and errorDescription
    - _Requirements: 12.1, 12.6_
  
  - [x] 6.2 Implement frontend payment error handling
    - Update `client/src/pages/CheckoutPage.jsx` to handle payment errors
    - Display user-friendly error messages
    - Preserve cart contents on failure
    - Add retry functionality
    - _Requirements: 12.2, 12.3, 12.4, 12.5_
  
  - [x] 6.3 Write unit tests for payment error handling
    - Test various payment failure scenarios
    - Test error message display
    - Test cart preservation on failure
    - _Requirements: 12.1, 12.2, 12.3_
  
  - [x] 6.4 Write property test for payment error codes
    - **Property 4: Payment Error Codes**
    - **Validates: Requirements 12.1**

- [x] 7. Implement Order Tracking System
  - [x] 7.1 Enhance Order model
    - Add status, statusHistory, trackingInfo fields to `server/src/model/order.model.js`
    - Add status enum with all order states
    - Add indexes on status field
    - _Requirements: 13.2, 13.3_
  
  - [x] 7.2 Create order status update endpoint
    - Add updateOrderStatus function in `server/src/controller/user.cart.controller.js`
    - Send email notification on status change
    - _Requirements: 13.2, 13.3_
  
  - [x] 7.3 Create OrderTracker component
    - Create `client/src/components/OrderTracker.jsx` with visual progress indicator
    - Display order status with icons
    - _Requirements: 13.1, 13.5_
  
  - [x] 7.4 Integrate order tracking into order history page
    - Update `client/src/pages/account/MyOrdersPage.jsx` to display order status
    - Add OrderTracker component for each order
    - _Requirements: 13.1, 13.4, 13.5_
  
  - [x] 7.5 Write unit tests for order tracking
    - Test order status updates
    - Test status history tracking
    - Test OrderTracker component rendering
    - _Requirements: 13.1, 13.2, 13.3_

- [x] 8. Checkpoint - Verify feature implementations
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement Database Optimizations
  - [x] 9.1 Add indexes to all models
    - Add indexes to User, Order, Product, Cart, Coupon models
    - Create compound indexes for common query patterns
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  
  - [x] 9.2 Create index creation script
    - Create `server/src/scripts/create-indexes.js`
    - Run script to create all indexes
    - _Requirements: 14.1_
  
  - [x] 9.3 Fix schema inconsistencies
    - Review NFC model and service for field name mismatches
    - Update schema or service to use consistent field names
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [x] 10. Implement Error Handling Standardization
  - [x] 10.1 Create error handler middleware
    - Create `server/src/middleware/errorHandler.middleware.js`
    - Implement errorHandler and asyncHandler functions
    - _Requirements: 18.1, 18.2_
  
  - [x] 10.2 Create custom error classes
    - Create `server/src/utils/errors.js` with ValidationError, AuthenticationError, etc.
    - _Requirements: 18.2, 18.3, 18.4, 18.5, 18.6, 18.7_
  
  - [x] 10.3 Update all controllers to use error handler
    - Wrap route handlers with asyncHandler
    - Use custom error classes for specific errors
    - Register errorHandler middleware in app.js
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7_
  
  - [x] 10.4 Write property tests for error handling
    - **Property 9: Error Response Consistency**
    - **Validates: Requirements 18.2**
    - **Property 10: HTTP Status Code Correctness**
    - **Validates: Requirements 18.3, 18.4, 18.5, 18.6, 18.7**

- [x] 11. Implement Structured Logging
  - [x] 11.1 Install and configure Winston logger
    - Install winston package
    - Create `server/src/config/logger.js` with log levels and transports
    - Configure file logging and console logging
    - _Requirements: 17.5_
  
  - [x] 11.2 Replace all console.log statements
    - Search and replace console.log with logger.info/debug
    - Replace console.error with logger.error
    - Remove debug console statements
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_
  
  - [x] 11.3 Add logging to critical operations
    - Log authentication events
    - Log payment operations
    - Log order creation and updates
    - Log errors with full context
    - _Requirements: 17.5, 17.6_

- [x] 12. Implement Frontend Code Splitting
  - [x] 12.1 Implement route-based code splitting
    - Update `client/src/component/AppRoutes.jsx` to use React.lazy for all routes
    - Wrap routes in Suspense with LoadingSpinner fallback
    - _Requirements: 21.1, 21.2, 21.3_
  
  - [x] 12.2 Configure Vite for optimal code splitting
    - Update `client/vite.config.js` with manual chunks configuration
    - Split vendor libraries into separate bundles
    - _Requirements: 21.1_
  
  - [x] 12.3 Implement component-level lazy loading
    - Lazy load heavy components (CouponList, OrderTracker)
    - Wrap in Suspense with appropriate fallbacks
    - _Requirements: 21.3_

- [x] 13. Implement Asset Optimization
  - [x] 13.1 Create OptimizedImage component
    - Create `client/src/components/OptimizedImage.jsx` with lazy loading and intersection observer
    - Add loading placeholder
    - _Requirements: 21.4, 22.1, 22.2_
  
  - [x] 13.2 Configure Vite for asset optimization
    - Update `client/vite.config.js` with minification and compression settings
    - Configure asset inlining for small files
    - Remove console.log in production builds
    - _Requirements: 22.2, 22.3, 22.4, 22.5_
  
  - [x] 13.3 Optimize fonts
    - Add font-display: swap to font-face declarations
    - Use system fonts as fallbacks
    - Preload critical fonts
    - _Requirements: 21.5, 22.6_
  
  - [x] 13.4 Replace img tags with OptimizedImage
    - Update product images, hero images, and other images to use OptimizedImage component
    - _Requirements: 21.4, 22.1_

- [ ] 14. Implement Global Design System
  - [ ] 14.1 Create design system CSS file
    - Create `client/src/styles/design-system.css` with CSS variables
    - Define colors, typography, spacing, borders, shadows
    - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5, 28.6, 28.7, 28.8_
  
  - [ ] 14.2 Import design system in main CSS
    - Import design-system.css in `client/src/index.css`
    - _Requirements: 28.8_
  
  - [ ] 14.3 Update components to use CSS variables
    - Replace hardcoded colors with var(--color-*)
    - Replace hardcoded spacing with var(--space-*)
    - Replace hardcoded font sizes with var(--text-*)
    - Update buttons, inputs, cards to use design system
    - _Requirements: 28.8, 29.1, 29.2, 29.3, 29.4, 29.5, 29.6, 29.7, 30.1, 30.2, 30.3, 30.4, 30.5, 30.6, 30.7, 31.1, 31.2, 31.3, 31.4, 31.5, 31.6, 31.7_
  
  - [ ] 14.4 Implement responsive design consistency
    - Define breakpoints in design system
    - Update media queries to use consistent breakpoints
    - Ensure touch targets are 44x44px on mobile
    - _Requirements: 32.1, 32.2, 32.3, 32.4, 32.5, 32.6_

- [x] 15. Implement Frontend Error Boundaries
  - [x] 15.1 Create ErrorBoundary component
    - Create `client/src/components/ErrorBoundary.jsx` with error catching and fallback UI
    - Add error logging
    - Add reset and go home buttons
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5, 26.6_
  
  - [x] 15.2 Wrap major sections in ErrorBoundary
    - Update `client/src/App.jsx` to wrap Header, Routes, Footer in ErrorBoundary
    - _Requirements: 26.1_
  
  - [x] 15.3 Write unit tests for ErrorBoundary
    - Test error catching and fallback UI display
    - Test reset functionality
    - _Requirements: 26.2, 26.4, 26.5_

- [x] 16. Implement Performance Monitoring
  - [x] 16.1 Create performance monitor utility
    - Create `client/src/utils/performanceMonitor.js` with Web Vitals monitoring
    - Add long task observer
    - _Requirements: 24.1, 24.2, 24.3, 24.4_
  
  - [x] 16.2 Integrate performance monitoring
    - Add performance monitoring to `client/src/main.jsx`
    - _Requirements: 24.1, 24.2, 24.3_
  
  - [x] 16.3 Add bundle size monitoring
    - Update `client/vite.config.js` with bundle size check plugin
    - Warn on bundles exceeding size limits
    - _Requirements: 24.4, 27.1, 27.2, 27.3, 27.4, 27.5, 27.6_

- [x] 17. Implement Authentication Flow Improvements
  - [x] 17.1 Implement auto-login after signup
    - Update `server/src/controller/user.controller.js` to generate JWT and set cookie on registration
    - Return user data with token
    - _Requirements: Auto-login requirement_
  
  - [x] 17.2 Implement frontend auto-login handling
    - Update `client/src/store/api/authApi.js` to set credentials on successful registration
    - Store user data in localStorage
    - _Requirements: Auto-login requirement_
  
  - [x] 17.3 Implement session persistence
    - Add session restoration logic in `client/src/App.jsx`
    - Check for token and stored user on app load
    - Restore Redux state if session exists
    - _Requirements: Auto-login requirement_
  
  - [x] 17.4 Implement logout flow
    - Clear JWT cookie, Redux state, and localStorage on logout
    - Redirect to home page
    - _Requirements: Auto-login requirement_
  
  - [ ]* 17.5 Write unit tests for authentication flows
    - Test signup with auto-login
    - Test login flow
    - Test logout flow
    - Test session persistence
    - _Requirements: Auto-login requirement_

- [x] 18. Checkpoint - Verify all implementations
  - Ensure all tests pass, ask the user if questions arise.

- [x] 19. Write End-to-End Test
  - [x] 19.1 Write complete purchase flow E2E test
    - Test user signup with auto-login
    - Test product browsing
    - Test adding products to cart
    - Test updating cart quantities
    - Test viewing cart
    - Test applying coupons
    - Test checkout flow
    - Test order creation
    - Test payment verification
    - Test order status tracking
    - Test cart clearing after payment
    - _Requirements: All requirements_
  
  - [x] 19.2 Write forgot password flow E2E test
    - Test OTP request
    - Test OTP verification and password reset
    - Test OTP invalidation
    - Test login with new password
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 20. Final Checkpoint - Production Readiness Verification
  - Run all tests (unit, property, integration, E2E)
  - Verify all critical bugs are fixed
  - Verify all security enhancements are in place
  - Verify all features are implemented
  - Verify code quality improvements are complete
  - Ask the user if ready for production deployment

## Notes

- Tasks marked with `*` are optional test tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples and edge cases
- E2E test validates the complete user journey from signup to payment
- All code uses JavaScript/TypeScript (MERN stack)
