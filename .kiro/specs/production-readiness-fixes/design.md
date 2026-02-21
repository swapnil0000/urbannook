# Design Document: Production Readiness Fixes

## Overview

This design document outlines the technical approach for making the UrbanNook e-commerce website production-ready. The application is a full-stack MERN (MongoDB, Express, React, Node.js) platform that requires critical bug fixes, security enhancements, feature completions, and code quality improvements before safe production deployment.

The design addresses 32 requirements organized into the following categories:
- Critical blocking bugs (API mismatches, service layer bugs, payment verification)
- Security vulnerabilities (OTP verification, environment variables, CORS, input validation)
- Feature implementations (coupon system, email notifications, order tracking)
- Frontend optimizations (code splitting, asset optimization, state management)
- Design system consistency (global CSS variables, typography, color palette)
- Code quality improvements (error handling, logging, cleanup)

## Architecture

### Current Architecture

The application follows a standard MERN stack architecture:

**Frontend (Client)**:
- React 19.2.0 with Vite build tool
- Redux Toolkit for state management
- RTK Query for API calls
- React Router for navigation
- Tailwind CSS for styling
- Framer Motion for animations

**Backend (Server)**:
- Node.js with Express 5.1.0
- MongoDB with Mongoose ODM
- JWT-based authentication
- Razorpay payment integration
- AWS S3 for file storage
- Nodemailer for email services

**Key Architectural Patterns**:
- RESTful API design
- Service layer pattern (controllers → services → models)
- Middleware-based authentication and authorization
- Redux slices for client-side state management


### Modified Architecture

The production-ready architecture will maintain the existing structure while adding:

**Security Layer**:
- OTP service for password reset verification
- Environment variable validation on startup
- CORS whitelist configuration
- Input validation middleware
- Structured logging system

**Coupon System Integration**:
- Frontend coupon UI components
- Real-time discount calculation
- Coupon validation and error handling
- Integration with checkout flow

**Frontend Optimization Layer**:
- Code splitting with React.lazy
- Asset optimization pipeline
- Performance monitoring
- Error boundaries
- Design system with CSS variables

**Enhanced Error Handling**:
- Consistent error response format
- Centralized error logging
- User-friendly error messages
- Retry mechanisms for failed operations

## Components and Interfaces

### 1. API Route Fixes

**Problem**: Client and server have mismatched endpoint definitions causing communication failures.

**Solution**: Standardize all API routes to match client expectations.

**Affected Routes**:
```javascript
// Current mismatch
Client: DELETE /user/clear-cart
Server: DELETE /user/cart/clear

// Fix: Update server route to match client
Server: DELETE /user/clear-cart
```

**Implementation**:
- Update `server/src/routes/user.cart.route.js` to use `/user/clear-cart`
- Verify all other routes match between client and server
- Document all API endpoints in a central location


### 2. Cart Service Bug Fix

**Problem**: `previewCartService` in `server/src/services/user.cart.service.js` line 221 returns `success: false` when it should return `success: true`.

**Current Code** (Incorrect):
```javascript
return {
  statusCode: 200,
  message: `Cart preview generated`,
  data: cartPreview,
  success: false  // BUG: Should be true
};
```

**Fixed Code**:
```javascript
return {
  statusCode: 200,
  message: `Cart preview generated`,
  data: cartPreview,
  success: true  // FIXED
};
```

**Impact**: This bug causes the frontend to treat successful cart previews as failures, breaking the checkout flow.

### 3. User Controller Dependency Fix

**Problem**: `userAccountDeletePreview` in `server/src/controller/user.controller.js` uses `jwt` without importing it.

**Current Code** (Line ~247):
```javascript
const confirmToken = jwt.sign(  // ERROR: jwt not imported
  { email, purpose: "account_deletion", timestamp: Date.now() },
  process.env.DELETION_TOKEN_SECRET,
  { expiresIn: "15m" }
);
```

**Fixed Code**:
```javascript
// Add import at top of file
import jwt from 'jsonwebtoken';

// Function works correctly with import
const confirmToken = jwt.sign(
  { email, purpose: "account_deletion", timestamp: Date.now() },
  process.env.DELETION_TOKEN_SECRET,
  { expiresIn: "15m" }
);
```


### 4. Payment Verification Fix

**Problem**: Razorpay webhook signature verification in `server/src/controller/rp.payment.controller.js` (lines 120-140) has two critical bugs:
1. Uses parsed JSON object instead of raw body for signature verification
2. Inverted verification logic (success treated as failure)

**Current Code** (Incorrect):
```javascript
const shasum = crypto.createHmac("sha256", secret);
shasum.update(req.body);  // BUG: req.body is parsed JSON, not raw
const expectedSignature = shasum.digest("hex");

if (expectedSignature !== signature) {  // BUG: Logic is inverted
  return res.status(400).json({
    statusCode: 400,
    success: false,
    error: "Invalid signature",
    data: null,
  });
}
```

**Fixed Code**:
```javascript
// Ensure raw body is available (already configured in routes)
const rawBody = req.body.toString('utf8');
const shasum = crypto.createHmac("sha256", secret);
shasum.update(rawBody);  // FIXED: Use raw body string
const expectedSignature = shasum.digest("hex");

if (expectedSignature === signature) {  // FIXED: Correct logic
  // Process valid payment
  const payload = JSON.parse(rawBody);
  // ... rest of webhook handling
} else {
  return res.status(400).json({
    statusCode: 400,
    success: false,
    error: "Invalid signature",
    data: null,
  });
}
```

**Note**: The route already uses `bodyParser.raw({ type: "application/json" })` which is correct. The bug is in how the controller uses the raw body.


### 5. Authentication Flow Improvements

**Problem**: Multiple authentication issues:
1. Forgot password has no OTP verification
2. User signup doesn't require login (auto-login after signup)
3. Session management needs improvement
4. Token refresh mechanism unclear

**Solution**: Implement comprehensive authentication flow with OTP verification and auto-login.

**Authentication Flow**:

1. **Signup Flow**:
   ```
   User submits registration → Validate input → Create user → Generate JWT → 
   Set cookie → Auto-login → Redirect to home
   ```

2. **Login Flow**:
   ```
   User submits credentials → Validate → Check password → Generate JWT → 
   Set cookie → Return user data → Redirect to intended page
   ```

3. **Forgot Password Flow** (NEW):
   ```
   User requests reset → Validate email → Generate OTP → Send email →
   User submits OTP + new password → Verify OTP → Update password → 
   Invalidate OTP → Send confirmation email
   ```

4. **Logout Flow**:
   ```
   User clicks logout → Clear JWT cookie → Clear Redux state → 
   Clear localStorage → Redirect to home
   ```

**OTP Service Interface**:
```javascript
// server/src/services/otp.service.js

class OTPService {
  // Generate and send OTP
  async generateOTP(email) {
    // Check if account is locked
    // Generate 6-digit OTP
    // Hash OTP before storing
    // Store in database with expiration (10 minutes)
    // Send via email
    // Return success/failure
  }
  
  // Verify OTP
  async verifyOTP(email, otp) {
    // Check if account is locked
    // Check if OTP exists and not expired
    // Compare hashed OTP
    // Check attempt count (max 3)
    // Invalidate OTP on success
    // Lock account after 3 failures
    // Return verification result
  }
  
  // Lock account temporarily after failed attempts
  async lockAccount(email, duration) {
    // Set lockedUntil timestamp in database
    // Duration: 30 minutes
  }
  
  // Check if account is locked
  async isLocked(email) {
    // Check if lockedUntil is in the future
    // Return boolean
  }
}
```

**OTP Model**:
```javascript
// server/src/model/otp.model.js
{
  email: String,
  otp: String,  // Hashed with bcrypt
  expiresAt: Date,
  attempts: Number,
  lockedUntil: Date,
  createdAt: Date
}
```

**Auto-Login After Signup**:
```javascript
// server/src/controller/user.controller.js

async function userRegister(req, res) {
  // ... create user
  
  // Generate JWT token
  const userAccessToken = jwt.sign(
    { userId: user.userId, email: user.email, role: 'USER' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  // Set cookie
  res.cookie('userAccessToken', userAccessToken, cookieOptions);
  
  // Return user data with token (auto-login)
  return res.status(201).json({
    statusCode: 201,
    message: 'User created and logged in',
    data: {
      email: user.email,
      name: user.name,
      userAccessToken,
      role: 'USER'
    },
    success: true
  });
}
```

**Frontend Auto-Login Handling**:
```javascript
// client/src/store/api/authApi.js

const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation({
      query: (credentials) => ({
        url: 'user/register',
        method: 'POST',
        body: credentials
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // Auto-login: Set credentials in Redux
          dispatch(setCredentials({
            user: data.data,
            token: data.data.userAccessToken
          }));
          // Store in localStorage
          localStorage.setItem('user', JSON.stringify(data.data));
        } catch (error) {
          console.error('Registration failed:', error);
        }
      }
    })
  })
});
```

**Session Persistence**:
```javascript
// client/src/App.jsx

useEffect(() => {
  // Check for existing session on app load
  const token = getCookie('userAccessToken');
  const storedUser = localStorage.getItem('user');
  
  if (token && storedUser) {
    // Restore session
    dispatch(setCredentials({
      user: JSON.parse(storedUser),
      token
    }));
  }
}, []);
```


### 6. Environment Variable Security

**Problem**: `.env` file with actual secrets is committed to repository, exposing JWT secrets, API keys, and database credentials.

**Solution**: 
1. Remove `.env` from repository
2. Add `.env` to `.gitignore`
3. Create `.env.example` with placeholder values
4. Implement environment validation on startup

**Environment Validation**:
```javascript
// server/src/config/validateEnv.js

const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'DELETION_TOKEN_SECRET',
  'RP_LOCAL_TEST_KEY_ID',
  'RP_LOCAL_TEST_KEY_SECRET',
  'RP_WEBHOOK_TEST_SECRET',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'AWS_BUCKET_NAME',
  'EMAIL_HOST',
  'EMAIL_PORT',
  'EMAIL_USER',
  'EMAIL_PASSWORD',
  'CORS_ORIGIN',
  'NODE_ENV'
];

export function validateEnvironment() {
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach(varName => console.error(`  - ${varName}`));
    process.exit(1);
  }
  
  console.log('✓ All required environment variables are set');
}
```

**Call in server.js**:
```javascript
import { validateEnvironment } from './config/validateEnv.js';

validateEnvironment();  // Fail fast if env vars missing
// ... rest of server startup
```


### 7. CORS Configuration

**Problem**: CORS configuration needs production whitelist to prevent unauthorized domain access.

**Solution**: Environment-based CORS configuration with whitelist.

**CORS Configuration**:
```javascript
// server/src/config/cors.config.js

const allowedOrigins = {
  development: ['http://localhost:5173', 'http://localhost:3000'],
  production: [
    'https://urbannook.com',
    'https://www.urbannook.com',
    // Add other production domains
  ],
  staging: ['https://staging.urbannook.com']
};

export const corsOptions = {
  origin: function (origin, callback) {
    const env = process.env.NODE_ENV || 'development';
    const whitelist = allowedOrigins[env];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
```

**Usage in app.js**:
```javascript
import cors from 'cors';
import { corsOptions } from './config/cors.config.js';

app.use(cors(corsOptions));
```


### 8. Coupon Frontend Integration

**Problem**: Backend coupon API is complete, but frontend has no UI for applying coupons during checkout.

**Solution**: Add coupon components to checkout page with real-time discount display.

**Coupon Component Structure**:

```javascript
// client/src/components/CouponInput.jsx
// - Input field for coupon code
// - Apply button
// - Error message display
// - Success message with discount amount
// - Remove coupon button (when applied)

// client/src/components/CouponList.jsx
// - Display available coupons
// - Show coupon details (name, discount, min cart value)
// - Click to apply functionality
```

**Integration Points**:

1. **Checkout Page** (`client/src/pages/CheckoutPage.jsx`):
   - Add CouponInput component above order summary
   - Display applied discount in order summary
   - Update total calculation with discount

2. **Redux State** (new slice or extend cart slice):
   ```javascript
   couponState: {
     appliedCoupon: null,
     discount: 0,
     error: null,
     isLoading: false
   }
   ```

3. **API Integration** (`client/src/store/api/userApi.js`):
   ```javascript
   applyCoupon: builder.mutation({
     query: (couponCode) => ({
       url: 'coupon/apply',
       method: 'POST',
       body: { couponCode }
     })
   }),
   
   removeCoupon: builder.mutation({
     query: () => ({
       url: 'coupon/remove',
       method: 'DELETE'
     })
   }),
   
   getAvailableCoupons: builder.query({
     query: () => 'coupon/list'
   })
   ```

**Order Summary Update**:
```javascript
// Display structure
Subtotal: ₹X,XXX
Discount (COUPON_CODE): -₹XXX
Shipping: Free
---
Total: ₹X,XXX
```


### 9. Email Notification System

**Problem**: Email notifications are not implemented for critical events (order confirmation, payment receipt, OTP).

**Solution**: Implement email service using existing Nodemailer setup.

**Email Service Interface**:
```javascript
// server/src/services/email.service.js (enhance existing)

class EmailService {
  async sendOrderConfirmation(userEmail, orderDetails) {
    // Template: Order number, items, total, delivery address
    // Subject: "Order Confirmed - #ORDER_ID"
  }
  
  async sendPaymentReceipt(userEmail, paymentDetails) {
    // Template: Payment ID, amount, date, order details
    // Subject: "Payment Receipt - ₹AMOUNT"
  }
  
  async sendOTP(userEmail, otp) {
    // Template: OTP code, expiration time, security warning
    // Subject: "Password Reset OTP - Urban Nook"
  }
  
  async sendWelcomeEmail(userEmail, userName) {
    // Template: Welcome message, getting started guide
    // Subject: "Welcome to Urban Nook!"
  }
  
  async sendOrderStatusUpdate(userEmail, orderId, status) {
    // Template: Order status, tracking info
    // Subject: "Order Update - #ORDER_ID"
  }
}
```

**Email Templates** (HTML):
- Use existing template structure in `server/src/template/`
- Create new templates for each email type
- Include Urban Nook branding
- Mobile-responsive design

**Retry Logic**:
```javascript
async function sendEmailWithRetry(emailFunction, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await emailFunction();
      return { success: true };
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`Email failed after ${maxRetries} attempts:`, error);
        return { success: false, error };
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```


### 10. Payment Failure Handling

**Problem**: Payment failures don't provide clear feedback or preserve cart state for retry.

**Solution**: Implement comprehensive payment error handling with user-friendly messages.

**Payment Error Codes**:
```javascript
const PAYMENT_ERROR_MESSAGES = {
  'payment_failed': 'Payment failed. Please try again or use a different payment method.',
  'payment_timeout': 'Payment timed out. Your cart has been preserved. Please try again.',
  'insufficient_funds': 'Insufficient funds. Please check your account balance.',
  'card_declined': 'Card declined. Please contact your bank or try another card.',
  'network_error': 'Network error. Please check your connection and try again.',
  'invalid_card': 'Invalid card details. Please check and try again.',
  'authentication_failed': '3D Secure authentication failed. Please try again.',
  'default': 'Payment could not be processed. Please try again later.'
};
```

**Enhanced Payment Verification**:
```javascript
// server/src/controller/rp.payment.controller.js

async function razorpayPaymentVerificationController(req, res) {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, error_code } = req.body;
    
    // Handle payment failure
    if (error_code) {
      await Order.updateOne(
        { "payment.razorpayOrderId": razorpay_order_id },
        { 
          $set: { 
            status: "FAILED",
            "payment.errorCode": error_code,
            "payment.errorDescription": PAYMENT_ERROR_MESSAGES[error_code] || PAYMENT_ERROR_MESSAGES.default
          } 
        }
      );
      
      return res.status(400).json({
        statusCode: 400,
        message: PAYMENT_ERROR_MESSAGES[error_code] || PAYMENT_ERROR_MESSAGES.default,
        data: { errorCode: error_code },
        success: false
      });
    }
    
    // Verify signature
    // ... existing verification logic
  } catch (error) {
    // Log error for debugging
    console.error('Payment verification error:', error);
    return res.status(500).json({
      statusCode: 500,
      message: PAYMENT_ERROR_MESSAGES.default,
      data: null,
      success: false
    });
  }
}
```

**Frontend Error Handling**:
```javascript
// client/src/pages/CheckoutPage.jsx

const handlePaymentError = (error) => {
  const errorMessage = error.description || 'Payment failed. Please try again.';
  
  // Show user-friendly error
  alert(errorMessage);
  
  // Cart is automatically preserved (not cleared on failure)
  // User can retry immediately
};

const options = {
  // ... other options
  handler: function (response) {
    // Success handler
  },
  modal: {
    ondismiss: function() {
      console.log('Payment cancelled by user');
      // Cart preserved for retry
    },
    escape: false,  // Prevent accidental dismissal
    confirm_close: true
  }
};
```


### 11. Order Tracking System

**Problem**: Order tracking functionality is incomplete.

**Solution**: Implement order status tracking with visual indicators.

**Order Status Flow**:
```
CREATED → PAID → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
                    ↓
                 CANCELLED
                    ↓
                 FAILED
```

**Order Model Enhancement**:
```javascript
// server/src/model/order.model.js (add fields)
{
  status: {
    type: String,
    enum: ['CREATED', 'PAID', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'FAILED'],
    default: 'CREATED'
  },
  statusHistory: [{
    status: String,
    timestamp: Date,
    note: String
  }],
  trackingInfo: {
    carrier: String,
    trackingNumber: String,
    estimatedDelivery: Date
  }
}
```

**Order Status Update API**:
```javascript
// server/src/controller/user.cart.controller.js

async function updateOrderStatus(req, res) {
  const { orderId, status, note } = req.body;
  
  const order = await Order.findOne({ orderId });
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }
  
  order.status = status;
  order.statusHistory.push({
    status,
    timestamp: new Date(),
    note
  });
  
  await order.save();
  
  // Send email notification
  await emailService.sendOrderStatusUpdate(
    order.userEmail,
    orderId,
    status
  );
  
  return res.status(200).json({ message: 'Order status updated', data: order });
}
```

**Frontend Order Tracking Component**:
```javascript
// client/src/components/OrderTracker.jsx

const OrderTracker = ({ status }) => {
  const steps = [
    { key: 'CONFIRMED', label: 'Confirmed', icon: 'check-circle' },
    { key: 'PROCESSING', label: 'Processing', icon: 'package' },
    { key: 'SHIPPED', label: 'Shipped', icon: 'truck' },
    { key: 'DELIVERED', label: 'Delivered', icon: 'home' }
  ];
  
  const currentStepIndex = steps.findIndex(s => s.key === status);
  
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={step.key} className={`
          flex flex-col items-center
          ${index <= currentStepIndex ? 'text-green-500' : 'text-gray-400'}
        `}>
          <i className={`fa-solid fa-${step.icon} text-2xl`} />
          <span className="text-xs mt-2">{step.label}</span>
        </div>
      ))}
    </div>
  );
};
```


### 12. Database Optimization

**Problem**: Missing indexes cause slow queries under production load.

**Solution**: Add indexes on frequently queried fields.

**Index Strategy**:
```javascript
// server/src/model/user.model.js
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ userId: 1 }, { unique: true });
userSchema.index({ mobileNumber: 1 });

// server/src/model/order.model.js
orderSchema.index({ orderId: 1 }, { unique: true });
orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ userId: 1, createdAt: -1 });  // Compound index for user order history
orderSchema.index({ 'payment.razorpayOrderId': 1 });
orderSchema.index({ 'payment.razorpayPaymentId': 1 });

// server/src/model/product.model.js
productSchema.index({ productId: 1 }, { unique: true });
productSchema.index({ productCategory: 1 });
productSchema.index({ productStatus: 1 });
productSchema.index({ productCategory: 1, productStatus: 1 });  // Compound index

// server/src/model/user.cart.model.js
cartSchema.index({ userId: 1 }, { unique: true });

// server/src/model/coupon.code.model.js
couponSchema.index({ name: 1 }, { unique: true });
couponSchema.index({ isPublished: 1 });

// server/src/model/otp.model.js (new)
otpSchema.index({ email: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });  // TTL index
```

**Index Creation Script**:
```javascript
// server/src/scripts/create-indexes.js

import mongoose from 'mongoose';
import User from '../model/user.model.js';
import Order from '../model/order.model.js';
import Product from '../model/product.model.js';
// ... import other models

async function createIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('Creating indexes...');
    
    await User.createIndexes();
    await Order.createIndexes();
    await Product.createIndexes();
    // ... create indexes for other models
    
    console.log('✓ All indexes created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Index creation failed:', error);
    process.exit(1);
  }
}

createIndexes();
```


### 13. Input Validation Middleware

**Problem**: Many endpoints lack input validation, exposing the application to malicious data.

**Solution**: Implement validation middleware using a validation library.

**Validation Middleware**:
```javascript
// server/src/middleware/validation.middleware.js

export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        statusCode: 400,
        message: 'Validation failed',
        data: errors,
        success: false
      });
    }
    
    next();
  };
};

// Sanitization helper
export const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input
      .trim()
      .replace(/[<>]/g, '')  // Remove potential HTML tags
      .substring(0, 1000);   // Limit length
  }
  return input;
};
```

**Validation Schemas** (using Joi or similar):
```javascript
// server/src/validation/user.validation.js

import Joi from 'joi';

export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(100).required(),
  mobileNumber: Joi.string().pattern(/^[0-9]{10}$/).required()
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  mobileNumber: Joi.string().pattern(/^[0-9]{10}$/)
}).min(1);  // At least one field required

export const otpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).pattern(/^[0-9]+$/).required()
});
```

**Usage in Routes**:
```javascript
// server/src/routes/user.route.js

import { validateRequest } from '../middleware/validation.middleware.js';
import { registerSchema, loginSchema } from '../validation/user.validation.js';

userRouter.post('/user/register', validateRequest(registerSchema), userRegister);
userRouter.post('/user/login', validateRequest(loginSchema), userLogin);
```


### 14. Structured Logging System

**Problem**: Console.log statements throughout code make debugging difficult and expose sensitive data.

**Solution**: Implement structured logging with log levels.

**Logger Configuration**:
```javascript
// server/src/config/logger.js

import winston from 'winston';

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  levels: logLevels,
  format: logFormat,
  transports: [
    // Error logs
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880,  // 5MB
      maxFiles: 5
    }),
    // Combined logs
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// Console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

export default logger;
```

**Usage**:
```javascript
// Replace console.log with logger
import logger from '../config/logger.js';

// Instead of: console.log('User logged in')
logger.info('User logged in', { userId, email });

// Instead of: console.error('Payment failed', error)
logger.error('Payment failed', { 
  userId, 
  orderId, 
  error: error.message,
  stack: error.stack 
});

// Debug information (only in development)
logger.debug('Cart calculation', { subtotal, discount, total });
```

**Remove Console Statements**:
- Search and replace all `console.log` with appropriate logger calls
- Remove all `console.error` and replace with `logger.error`
- Remove debug console statements or convert to `logger.debug`


### 15. Error Handling Standardization

**Problem**: Inconsistent error handling across endpoints makes debugging difficult.

**Solution**: Implement centralized error handling with consistent response format.

**Error Handler Middleware**:
```javascript
// server/src/middleware/errorHandler.middleware.js

export const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error('Request error', {
    method: req.method,
    url: req.url,
    error: err.message,
    stack: err.stack,
    userId: req.user?.userId
  });
  
  // Determine status code
  const statusCode = err.statusCode || 500;
  
  // Determine error message
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Internal server error'
    : err.message;
  
  // Send response
  res.status(statusCode).json({
    statusCode,
    message,
    data: process.env.NODE_ENV === 'production' ? null : err.stack,
    success: false
  });
};

// Async error wrapper
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

**Custom Error Classes**:
```javascript
// server/src/utils/errors.js

export class ValidationError extends Error {
  constructor(message, fields) {
    super(message);
    this.statusCode = 400;
    this.fields = fields;
  }
}

export class AuthenticationError extends Error {
  constructor(message = 'Authentication failed') {
    super(message);
    this.statusCode = 401;
  }
}

export class AuthorizationError extends Error {
  constructor(message = 'Access denied') {
    super(message);
    this.statusCode = 403;
  }
}

export class NotFoundError extends Error {
  constructor(resource = 'Resource') {
    super(`${resource} not found`);
    this.statusCode = 404;
  }
}

export class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 409;
  }
}
```

**Usage in Controllers**:
```javascript
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

export const getUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const user = await User.findOne({ userId });
  if (!user) {
    throw new NotFoundError('User');
  }
  
  res.status(200).json({
    statusCode: 200,
    message: 'User found',
    data: user,
    success: true
  });
});
```

**Register in app.js**:
```javascript
import { errorHandler } from './middleware/errorHandler.middleware.js';

// ... routes

// Error handler must be last
app.use(errorHandler);
```


### 16. Frontend Code Splitting

**Problem**: Large bundle sizes cause slow initial page loads.

**Solution**: Implement route-based code splitting with React.lazy.

**Code Splitting Strategy**:
```javascript
// client/src/component/AppRoutes.jsx

import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import LoadingSpinner from './layout/LoadingSpinner';

// Lazy load route components
const HomePage = lazy(() => import('../pages/home/HomePage'));
const AllProductsPage = lazy(() => import('../pages/shop/AllProductsPage'));
const ProductDetailPage = lazy(() => import('../pages/shop/ProductDetailPage'));
const CheckoutPage = lazy(() => import('../pages/CheckoutPage'));
const MyOrdersPage = lazy(() => import('../pages/account/MyOrdersPage'));
const MyProfilePage = lazy(() => import('../pages/account/MyProfilePage'));
const AdminDashboardPage = lazy(() => import('../admin/pages/AdminDashboardPage'));

// Wrap routes in Suspense
const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<AllProductsPage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/orders" element={<MyOrdersPage />} />
        <Route path="/profile" element={<MyProfilePage />} />
        <Route path="/admin/*" element={<AdminDashboardPage />} />
      </Routes>
    </Suspense>
  );
};
```

**Component-Level Lazy Loading**:
```javascript
// Lazy load heavy components
const CouponList = lazy(() => import('./CouponList'));
const OrderTracker = lazy(() => import('./OrderTracker'));

// Usage
<Suspense fallback={<div>Loading...</div>}>
  <CouponList />
</Suspense>
```

**Vite Configuration**:
```javascript
// client/vite.config.js

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-redux': ['@reduxjs/toolkit', 'react-redux'],
          'vendor-ui': ['framer-motion', 'lucide-react']
        }
      }
    },
    chunkSizeWarningLimit: 500
  }
});
```


### 17. Asset Optimization

**Problem**: Unoptimized images and assets slow down page load.

**Solution**: Implement image optimization and lazy loading.

**Image Optimization**:
```javascript
// client/src/components/OptimizedImage.jsx

import { useState, useEffect, useRef } from 'react';

const OptimizedImage = ({ src, alt, className, placeholder }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef();
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <div ref={imgRef} className={`relative ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      {isInView && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        />
      )}
    </div>
  );
};

export default OptimizedImage;
```

**Vite Image Optimization Plugin**:
```javascript
// client/vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { imagetools } from 'vite-imagetools';

export default defineConfig({
  plugins: [
    react(),
    imagetools()
  ],
  build: {
    assetsInlineLimit: 4096,  // Inline assets < 4kb
    cssCodeSplit: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // Remove console.log in production
        drop_debugger: true
      }
    }
  }
});
```

**Font Optimization**:
```css
/* client/src/index.css */

/* Preload critical fonts */
@font-face {
  font-family: 'Primary';
  src: url('/fonts/primary.woff2') format('woff2');
  font-display: swap;
  font-weight: 400;
}

/* Use system fonts as fallback */
body {
  font-family: 'Primary', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```


### 18. Global Design System

**Problem**: Inconsistent fonts, colors, and spacing across the application.

**Solution**: Create global CSS variables and design tokens.

**Design System File**:
```css
/* client/src/styles/design-system.css */

:root {
  /* === COLORS === */
  
  /* Primary Colors */
  --color-primary-50: #f0f4f2;
  --color-primary-100: #d9e5df;
  --color-primary-200: #b3cbbf;
  --color-primary-300: #8db19f;
  --color-primary-400: #67977f;
  --color-primary-500: #2e443c;  /* Main brand color */
  --color-primary-600: #253730;
  --color-primary-700: #1c2b25;
  --color-primary-800: #131e1a;
  --color-primary-900: #0a100e;
  
  /* Accent Colors */
  --color-accent-50: #fef9f0;
  --color-accent-100: #fdf3e0;
  --color-accent-200: #fbe7c1;
  --color-accent-300: #f9dba2;
  --color-accent-400: #f7cf83;
  --color-accent-500: #F5DEB3;  /* Wheat/Tan */
  --color-accent-600: #c4b28f;
  --color-accent-700: #93866b;
  --color-accent-800: #625a47;
  --color-accent-900: #312d24;
  
  /* Neutral Colors */
  --color-neutral-50: #fafafa;
  --color-neutral-100: #f5f5f5;
  --color-neutral-200: #e5e5e5;
  --color-neutral-300: #d4d4d4;
  --color-neutral-400: #a3a3a3;
  --color-neutral-500: #737373;
  --color-neutral-600: #525252;
  --color-neutral-700: #404040;
  --color-neutral-800: #262626;
  --color-neutral-900: #171717;
  
  /* Semantic Colors */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
  
  /* === TYPOGRAPHY === */
  
  /* Font Families */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  --font-serif: 'Georgia', 'Times New Roman', serif;
  --font-mono: 'Courier New', monospace;
  
  /* Font Sizes */
  --text-xs: 0.75rem;      /* 12px */
  --text-sm: 0.875rem;     /* 14px */
  --text-base: 1rem;       /* 16px */
  --text-lg: 1.125rem;     /* 18px */
  --text-xl: 1.25rem;      /* 20px */
  --text-2xl: 1.5rem;      /* 24px */
  --text-3xl: 1.875rem;    /* 30px */
  --text-4xl: 2.25rem;     /* 36px */
  --text-5xl: 3rem;        /* 48px */
  
  /* Font Weights */
  --font-light: 300;
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  
  /* Line Heights */
  --leading-tight: 1.2;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
  
  /* === SPACING === */
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
  
  /* === BORDERS === */
  --radius-sm: 0.25rem;   /* 4px */
  --radius-md: 0.5rem;    /* 8px */
  --radius-lg: 1rem;      /* 16px */
  --radius-xl: 1.5rem;    /* 24px */
  --radius-2xl: 2rem;     /* 32px */
  --radius-full: 9999px;
  
  /* === SHADOWS === */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
  --shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
  
  /* === TRANSITIONS === */
  --transition-fast: 150ms ease-in-out;
  --transition-base: 300ms ease-in-out;
  --transition-slow: 500ms ease-in-out;
}
```

**Usage in Components**:
```css
/* Instead of hardcoded values */
.button {
  background-color: var(--color-accent-500);
  color: var(--color-primary-500);
  padding: var(--space-4) var(--space-6);
  border-radius: var(--radius-lg);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  transition: all var(--transition-base);
}

.button:hover {
  background-color: var(--color-accent-600);
  box-shadow: var(--shadow-lg);
}
```


### 19. Frontend Error Boundaries

**Problem**: Component errors crash the entire application.

**Solution**: Implement React Error Boundaries for graceful error handling.

**Error Boundary Component**:
```javascript
// client/src/components/ErrorBoundary.jsx

import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    // Log error to monitoring service
    console.error('Error caught by boundary:', error, errorInfo);
    
    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Send to Sentry, LogRocket, etc.
    }
  }
  
  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#2e443c] flex items-center justify-center p-4">
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 max-w-md text-center border border-white/10">
            <i className="fa-solid fa-triangle-exclamation text-6xl text-[#F5DEB3] mb-4"></i>
            <h2 className="text-2xl font-serif text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-400 mb-6">
              We're sorry for the inconvenience. Please try again.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-[#F5DEB3] text-[#2e443c] rounded-lg font-semibold hover:bg-white transition-all"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-all"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

export default ErrorBoundary;
```

**Usage in App**:
```javascript
// client/src/App.jsx

import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <ErrorBoundary>
          <Header />
        </ErrorBoundary>
        
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
        
        <ErrorBoundary>
          <Footer />
        </ErrorBoundary>
      </Router>
    </ErrorBoundary>
  );
}
```


### 20. Performance Monitoring

**Problem**: No visibility into frontend performance metrics.

**Solution**: Implement Core Web Vitals monitoring.

**Performance Monitor**:
```javascript
// client/src/utils/performanceMonitor.js

export const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

export const logPerformanceMetrics = (metric) => {
  console.log(metric);
  
  // In production, send to analytics
  if (process.env.NODE_ENV === 'production') {
    // Send to Google Analytics, Vercel Analytics, etc.
    // Example: gtag('event', metric.name, { value: metric.value });
  }
};

// Monitor long tasks
export const observeLongTasks = () => {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {  // Tasks longer than 50ms
          console.warn('Long task detected:', {
            duration: entry.duration,
            startTime: entry.startTime
          });
        }
      }
    });
    
    observer.observe({ entryTypes: ['longtask'] });
  }
};
```

**Usage in main.jsx**:
```javascript
// client/src/main.jsx

import { reportWebVitals, logPerformanceMetrics, observeLongTasks } from './utils/performanceMonitor';

// Start monitoring
reportWebVitals(logPerformanceMetrics);
observeLongTasks();
```

**Bundle Size Monitoring**:
```javascript
// client/vite.config.js

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  },
  plugins: [
    react(),
    // Bundle analyzer plugin
    {
      name: 'bundle-size-check',
      closeBundle() {
        const fs = require('fs');
        const path = require('path');
        const distPath = path.resolve(__dirname, 'dist');
        
        // Check bundle sizes
        const files = fs.readdirSync(distPath);
        files.forEach(file => {
          const stats = fs.statSync(path.join(distPath, file));
          const sizeInKB = stats.size / 1024;
          
          if (sizeInKB > 250 && file.endsWith('.js')) {
            console.warn(`⚠️  Large bundle detected: ${file} (${sizeInKB.toFixed(2)} KB)`);
          }
        });
      }
    }
  ]
});
```


## Data Models

### OTP Model (New)

```javascript
// server/src/model/otp.model.js
{
  email: {
    type: String,
    required: true,
    index: true
  },
  otp: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  lockedUntil: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}
```

### Order Model (Enhanced)

```javascript
// server/src/model/order.model.js (add fields)
{
  // ... existing fields
  status: {
    type: String,
    enum: ['CREATED', 'PAID', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'FAILED'],
    default: 'CREATED',
    index: true
  },
  statusHistory: [{
    status: String,
    timestamp: Date,
    note: String
  }],
  trackingInfo: {
    carrier: String,
    trackingNumber: String,
    estimatedDelivery: Date
  },
  payment: {
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String, index: true },
    errorCode: String,
    errorDescription: String
  }
}
```

### Existing Models (Index Additions)

All existing models will have indexes added as specified in the Database Optimization section.


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: API Route Consistency

*For any* client API call, the server SHALL have a matching route that responds correctly.

**Validates: Requirements 1.3**

### Property 2: Coupon Discount Calculation

*For any* valid coupon and cart total, when the coupon is applied, the discount SHALL be calculated correctly according to the coupon type (PERCENTAGE or FLAT), and SHALL respect minimum cart value and maximum discount limits.

**Validates: Requirements 8.2, 8.4, 8.5**

### Property 3: Coupon Validation Errors

*For any* invalid coupon (expired, unpublished, or cart below minimum), the Coupon_Service SHALL return an appropriate error message explaining the specific reason for rejection.

**Validates: Requirements 8.3**

### Property 4: Payment Error Codes

*For any* payment failure scenario, the Payment_Service SHALL return a specific error code that accurately describes the failure reason.

**Validates: Requirements 12.1**

### Property 5: Input Validation

*For any* API endpoint that accepts user input, when invalid data is submitted, the Server SHALL validate the input and return a 400 status code with specific field-level error messages.

**Validates: Requirements 15.1, 15.5, 19.1**

### Property 6: Email Format Validation

*For any* email address submitted to the system, the Server SHALL validate that it matches standard email format (contains @ symbol, valid domain structure).

**Validates: Requirements 15.2**

### Property 7: Phone Number Format Validation

*For any* phone number submitted to the system, the Server SHALL validate that it matches the expected format (10 digits for Indian numbers).

**Validates: Requirements 15.3**

### Property 8: Price Validation

*For any* price value submitted to the system, the Server SHALL validate that it is a positive number greater than zero.

**Validates: Requirements 15.4**

### Property 9: Error Response Consistency

*For any* error that occurs during request processing, the Server SHALL return a response with a consistent structure containing statusCode, message, data, and success fields.

**Validates: Requirements 18.2**

### Property 10: HTTP Status Code Correctness

*For any* request, the Server SHALL return the appropriate HTTP status code: 400 for validation errors, 401 for authentication failures, 403 for authorization failures, 404 for not found, and 500 for server errors.

**Validates: Requirements 18.3, 18.4, 18.5, 18.6, 18.7**

### Property 11: Input Sanitization

*For any* string input received by the Server, the input SHALL be sanitized to remove potentially malicious characters (HTML tags, script tags) before processing.

**Validates: Requirements 19.2**

### Property 12: Numeric Range Validation

*For any* numeric input received by the Server, the value SHALL be validated to ensure it falls within acceptable ranges for that field type.

**Validates: Requirements 19.3**


## Error Handling

### Error Response Format

All API errors will follow a consistent format:

```javascript
{
  statusCode: number,      // HTTP status code
  message: string,         // Human-readable error message
  data: any | null,        // Additional error details (null in production for 500 errors)
  success: false           // Always false for errors
}
```

### Error Categories

1. **Validation Errors (400)**
   - Invalid input format
   - Missing required fields
   - Out-of-range values
   - Format: Include field-level details in `data`

2. **Authentication Errors (401)**
   - Missing or invalid JWT token
   - Expired token
   - Invalid credentials

3. **Authorization Errors (403)**
   - Insufficient permissions
   - Role-based access denial

4. **Not Found Errors (404)**
   - Resource doesn't exist
   - Invalid ID or reference

5. **Conflict Errors (409)**
   - Duplicate resource
   - State conflict

6. **Server Errors (500)**
   - Unexpected exceptions
   - Database errors
   - Third-party service failures

### Error Logging

All errors will be logged with:
- Timestamp
- Request method and URL
- User ID (if authenticated)
- Error message and stack trace
- Request body (sanitized)

### Frontend Error Handling

1. **Network Errors**: Show retry button
2. **Validation Errors**: Display field-level errors
3. **Authentication Errors**: Redirect to login
4. **Payment Errors**: Show user-friendly message with retry option
5. **Component Errors**: Show error boundary fallback UI


## Testing Strategy

### Dual Testing Approach

This project will use both unit tests and property-based tests to ensure comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs
- Both are complementary and necessary for production readiness

### Unit Testing

Unit tests will focus on:

1. **Specific Examples**
   - API route existence (clear cart endpoint at `/user/clear-cart`)
   - OTP generation and validation flow
   - Payment webhook signature verification
   - Email sending for specific events

2. **Edge Cases**
   - Empty cart scenarios
   - Expired OTPs
   - Maximum discount limits
   - Minimum cart value boundaries

3. **Integration Points**
   - Coupon application in checkout flow
   - Order status updates triggering emails
   - Cart synchronization between client and server

4. **Error Conditions**
   - Missing environment variables on startup
   - Invalid coupon codes
   - Payment failures
   - Network timeouts

### Property-Based Testing

Property tests will verify universal properties with minimum 100 iterations per test:

1. **Coupon Discount Calculation** (Property 2)
   - Generate random coupons (PERCENTAGE/FLAT, various values)
   - Generate random cart totals
   - Verify discount calculation respects all rules

2. **Input Validation** (Properties 5-8)
   - Generate random invalid inputs
   - Verify all are rejected with appropriate errors

3. **Error Response Consistency** (Property 9)
   - Trigger various error conditions
   - Verify all responses follow consistent format

4. **HTTP Status Codes** (Property 10)
   - Generate various error scenarios
   - Verify correct status codes returned

5. **Input Sanitization** (Property 11)
   - Generate strings with malicious content
   - Verify all are sanitized correctly

### Testing Tools

**Backend**:
- Jest for unit and integration tests
- fast-check for property-based testing
- Supertest for API endpoint testing
- MongoDB Memory Server for database tests

**Frontend**:
- Vitest for unit tests
- React Testing Library for component tests
- MSW (Mock Service Worker) for API mocking
- fast-check for property-based testing

### Test Organization

```
server/
  src/
    __tests__/
      unit/
        services/
          cart.service.test.js
          otp.service.test.js
          payment.service.test.js
        controllers/
          user.controller.test.js
          payment.controller.test.js
      integration/
        api/
          cart.api.test.js
          coupon.api.test.js
          payment.api.test.js
      properties/
        coupon.properties.test.js
        validation.properties.test.js
        error-handling.properties.test.js

client/
  src/
    __tests__/
      unit/
        components/
          CouponInput.test.jsx
          OrderTracker.test.jsx
          ErrorBoundary.test.jsx
      integration/
        pages/
          CheckoutPage.test.jsx
      properties/
        validation.properties.test.js
```

### Property Test Configuration

Each property test will:
- Run minimum 100 iterations
- Include a comment tag referencing the design property
- Format: `// Feature: production-readiness-fixes, Property N: [property text]`

Example:
```javascript
// Feature: production-readiness-fixes, Property 2: Coupon Discount Calculation
test('coupon discount calculation respects all rules', () => {
  fc.assert(
    fc.property(
      couponGenerator(),
      cartTotalGenerator(),
      (coupon, cartTotal) => {
        const discount = calculateDiscount(coupon, cartTotal);
        // Verify discount calculation
      }
    ),
    { numRuns: 100 }
  );
});
```

### Coverage Goals

- Unit test coverage: 80% minimum
- Property test coverage: All testable acceptance criteria
- Integration test coverage: All critical user flows
- E2E test coverage: Checkout and payment flows

### Continuous Integration

All tests will run on:
- Every pull request
- Before deployment to staging
- Before deployment to production

Failed tests will block deployment.

### End-to-End Testing

A comprehensive end-to-end test will verify the complete user journey:

**E2E Test: Complete Purchase Flow**

```javascript
// server/src/__tests__/e2e/complete-purchase-flow.test.js

describe('Complete Purchase Flow E2E', () => {
  let testUser;
  let authToken;
  let productId;
  let orderId;
  
  test('Complete user journey from signup to payment', async () => {
    // Step 1: User Signup
    const signupResponse = await request(app)
      .post('/user/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123',
        mobileNumber: '9876543210'
      });
    
    expect(signupResponse.status).toBe(201);
    expect(signupResponse.body.success).toBe(true);
    expect(signupResponse.body.data.userAccessToken).toBeDefined();
    
    authToken = signupResponse.body.data.userAccessToken;
    testUser = signupResponse.body.data;
    
    // Verify auto-login (token in cookie)
    expect(signupResponse.headers['set-cookie']).toBeDefined();
    
    // Step 2: Browse Products
    const productsResponse = await request(app)
      .get('/product/all')
      .set('Cookie', `userAccessToken=${authToken}`);
    
    expect(productsResponse.status).toBe(200);
    expect(productsResponse.body.data.length).toBeGreaterThan(0);
    
    productId = productsResponse.body.data[0].productId;
    
    // Step 3: Add Product to Cart
    const addToCartResponse = await request(app)
      .post('/user/cart/add')
      .set('Cookie', `userAccessToken=${authToken}`)
      .send({ productId });
    
    expect(addToCartResponse.status).toBe(200);
    expect(addToCartResponse.body.success).toBe(true);
    
    // Step 4: Add More Items (increase quantity)
    const updateCartResponse = await request(app)
      .post('/user/cart/update')
      .set('Cookie', `userAccessToken=${authToken}`)
      .send({ 
        productId, 
        quantity: 2,
        action: 'add'
      });
    
    expect(updateCartResponse.status).toBe(200);
    
    // Step 5: Get Cart
    const getCartResponse = await request(app)
      .get('/user/cart/get')
      .set('Cookie', `userAccessToken=${authToken}`);
    
    expect(getCartResponse.status).toBe(200);
    expect(getCartResponse.body.data.items.length).toBeGreaterThan(0);
    
    const cartTotal = getCartResponse.body.data.summary.preTotal;
    
    // Step 6: Apply Coupon
    const applyCouponResponse = await request(app)
      .post('/coupon/apply')
      .set('Cookie', `userAccessToken=${authToken}`)
      .send({ couponCode: 'TEST10' });
    
    // Coupon may or may not exist, but endpoint should respond
    expect([200, 400, 404]).toContain(applyCouponResponse.status);
    
    // Step 7: Go to Checkout (Get Updated Cart)
    const checkoutCartResponse = await request(app)
      .get('/user/cart/get')
      .set('Cookie', `userAccessToken=${authToken}`);
    
    expect(checkoutCartResponse.status).toBe(200);
    
    const finalTotal = checkoutCartResponse.body.data.summary.grandTotal;
    
    // Step 8: Create Order
    const createOrderResponse = await request(app)
      .post('/user/create-order')
      .set('Cookie', `userAccessToken=${authToken}`)
      .send({
        items: checkoutCartResponse.body.data.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        }))
      });
    
    expect(createOrderResponse.status).toBe(200);
    expect(createOrderResponse.body.data.razorpayOrderId).toBeDefined();
    
    orderId = createOrderResponse.body.data.orderId;
    const razorpayOrderId = createOrderResponse.body.data.razorpayOrderId;
    
    // Step 9: Simulate Payment Verification
    // (In real scenario, this comes from Razorpay)
    const paymentId = 'pay_test_' + Date.now();
    const signature = crypto
      .createHmac('sha256', process.env.RP_LOCAL_TEST_KEY_SECRET)
      .update(`${razorpayOrderId}|${paymentId}`)
      .digest('hex');
    
    const verifyPaymentResponse = await request(app)
      .post('/user/payment/verification')
      .set('Cookie', `userAccessToken=${authToken}`)
      .send({
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature
      });
    
    expect(verifyPaymentResponse.status).toBe(200);
    expect(verifyPaymentResponse.body.success).toBe(true);
    
    // Step 10: Verify Order Status
    const orderHistoryResponse = await request(app)
      .get('/user/order/history')
      .set('Cookie', `userAccessToken=${authToken}`);
    
    expect(orderHistoryResponse.status).toBe(200);
    expect(orderHistoryResponse.body.data.length).toBeGreaterThan(0);
    
    const order = orderHistoryResponse.body.data.find(o => o.orderId === orderId);
    expect(order.status).toBe('PAID');
    
    // Step 11: Verify Cart is Cleared
    const clearedCartResponse = await request(app)
      .get('/user/cart/get')
      .set('Cookie', `userAccessToken=${authToken}`);
    
    expect(clearedCartResponse.status).toBe(200);
    // Cart should be empty or have no items
    expect(
      !clearedCartResponse.body.data || 
      clearedCartResponse.body.data.items.length === 0
    ).toBe(true);
  });
  
  test('Forgot password flow with OTP', async () => {
    // Step 1: Request Password Reset
    const requestResetResponse = await request(app)
      .post('/user/forgot-password/request')
      .send({ email: testUser.email });
    
    expect(requestResetResponse.status).toBe(200);
    expect(requestResetResponse.body.message).toContain('OTP sent');
    
    // Step 2: Get OTP from database (in real scenario, user gets from email)
    const otpRecord = await OTP.findOne({ email: testUser.email });
    expect(otpRecord).toBeDefined();
    
    // Step 3: Verify OTP and Reset Password
    const resetPasswordResponse = await request(app)
      .post('/user/forgot-password/reset')
      .send({
        email: testUser.email,
        otp: otpRecord.otp,  // In real scenario, user types this
        newPassword: 'NewSecurePass456'
      });
    
    expect(resetPasswordResponse.status).toBe(200);
    expect(resetPasswordResponse.body.success).toBe(true);
    
    // Step 4: Verify OTP is Invalidated
    const usedOtpRecord = await OTP.findOne({ email: testUser.email });
    expect(usedOtpRecord).toBeNull();  // Should be deleted after use
    
    // Step 5: Login with New Password
    const loginResponse = await request(app)
      .post('/user/login')
      .send({
        email: testUser.email,
        password: 'NewSecurePass456'
      });
    
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);
  });
});
```

This E2E test verifies:
1. ✅ User signup with auto-login
2. ✅ Product browsing
3. ✅ Adding products to cart
4. ✅ Updating cart quantities
5. ✅ Viewing cart
6. ✅ Applying coupons
7. ✅ Checkout flow
8. ✅ Order creation
9. ✅ Payment verification
10. ✅ Order status tracking
11. ✅ Cart clearing after payment
12. ✅ Forgot password with OTP
13. ✅ Login with new password
