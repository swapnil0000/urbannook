# UrbanNook Server Code Review

## Overview
Comprehensive code review of the Node.js/MongoDB e-commerce backend with security vulnerabilities, performance optimizations, and best practices.

---

## Critical Security Vulnerabilities

### 1. Admin Password Storage Without Hashing  ✅
**File**: `server/src/model/admin.model.js`

The Admin model lacks a `pre('save')` hook for password hashing, unlike the User model. Admin passwords are stored in plain text.

**Fix**:
```javascript
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
```

### 2. Insecure Account Deletion Token ✅
**File**: `server/src/controller/user.controller.js` (Lines 279-357)

Account deletion uses Base64 encoding (NOT encryption) for "confirmation tokens". Anyone can decode and delete any account.

```javascript
// CURRENT (INSECURE)
const confirmToken = Buffer.from(email).toString("base64");
```

**Fix**: Use JWT for secure tokens:
```javascript
const confirmToken = jwt.sign(
  { email, purpose: 'account_deletion', timestamp: Date.now() },
  process.env.DELETION_TOKEN_SECRET,
  { expiresIn: '15m' }
);
```

### 3. Missing Input Validation on Admin Product Creation ✅
**File**: `server/src/controller/admin.controller.js` (Lines 71-99)

`createProduct` accepts user input without validation, risking NoSQL injection and malformed data.

**Fix**: Add Joi validation:
```javascript
import Joi from 'joi';

const productSchema = Joi.object({
  productName: Joi.string().trim().min(3).max(100).required(),
  sellingPrice: Joi.number().positive().max(1000000).required(),
  productStatus: Joi.string().valid('in_stock', 'out_of_stock', 'discontinued').required(),
  productQuantity: Joi.number().integer().min(0).default(1)
});
```

### 4. Webhook Signature Verification Bug ✅
**File**: `server/src/controller/rp.payment.controller.js` (Lines 95-110)

Double signature verification with incorrect logic - redundant and potentially faulty.

**Fix**:
```javascript
const secret = process.env.RP_WEBHOOK_TEST_SECRET;
const signature = req.headers["x-razorpay-signature"];

if (!signature) {
  return res.status(400).json({ success: false, error: "Missing signature" });
}

const shasum = crypto.createHmac("sha256", secret);
shasum.update(req.body);
const expectedSignature = shasum.digest("hex");

if (expectedSignature !== signature) {
  return res.status(400).json({ success: false, error: "Invalid signature" });
}
```

### 5. Undefined Variable References ✅
**File**: `server/src/controller/user.controller.js` (Lines 283, 155, 99)

Multiple references to undefined `email` variable in scope.

### 6. Missing bcrypt Import ✅
**File**: `server/src/controller/user.controller.js` (Line 99)

`bcrypt.compare()` used but bcrypt not imported.

---

## High Priority Performance Issues

### 7. Missing Database Indexes ✅
**Files**: Multiple model files

Add critical indexes:
```javascript
// user.model.js
userSchema.index({ userId: 1 });
userSchema.index({ email: 1 });
userSchema.index({ mobileNumber: 1 });
userSchema.index({ verificationOtp: 1, verificationOtpExpiresAt: 1 });

// order.model.js
orderSchema.index({ userId: 1, status: 1 });
orderSchema.index({ 'payment.razorpayOrderId': 1 });
orderSchema.index({ createdAt: -1 });

// user.cart.model.js
cartSchema.index({ userId: 1 }, { unique: true });

// user.wishlist.model.js
wishListSchema.index({ userId: 1 }, { unique: true });
```

### 8. Inefficient Product Listing Query ✅ ( Updated with hybrid approach for small strings and longer strings -> regex , textScore respectively)
**File**: `server/src/controller/product.controller.js` (Lines 11-15)

Uses case-insensitive regex without text index.

**Fix**: Use MongoDB text index:
```javascript
// In product.model.js
productSchema.index({ productName: 'text', productDes: 'text' });

// In controller
if (search) {
  query.$text = { $search: search };
  sort = { score: { $meta: 'textScore' } };
}
```

### 9. No Connection Pooling Configuration ✅
**File**: `server/src/db/conn.js`

**Fix**:
```javascript
await mongoose.connect(`${process.env.DB_URI_PROD}/${DB_NAME}`, {
  maxPoolSize: 10,
  minPoolSize: 2,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000,
  family: 4
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. Attempting to reconnect...');
});
```

---

## Medium Priority Code Quality Issues

### 10. Inconsistent Error Handling Patterns ✅
Mix of `return res.status()` and `return new ApiError()`:

```javascript
// WRONG (returns object, doesn't send response)
return new ApiError(500, null, `Internal Server Error -${error}`, false);

// CORRECT
return res.status(500).json(new ApiError(500, null, `Internal Server Error -${error}`, false));
```

### 11. DRY Violation - Duplicate Email Transporter ✅
**Files**: `server/src/services/email.service.js`, `server/src/controller/user.community.controller.js`

Nodemailer transporter created multiple times.

**Fix**: Create singleton:
```javascript
let transporter = null;

export const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      secure: true,
      host: "smtp.zoho.in",
      port: 465,
      auth: {
        user: process.env.ZOHO_ADMIN_EMAIL,
        pass: process.env.ZOHO_SMTP_SECRET,
      },
    });
  }
  return transporter;
};
```

### 12. Email Service Bugs ✅
**File**: `server/src/services/email.service.js`

```javascript
// LINE 25 - Syntax error
message: `OTP sent to` - to,  // Should be: `OTP sent to ${to}`

// LINE 38 - Missing semicolon
export default sendEmail  // Should be: export default sendEmail;
```

### 13. Inconsistent Status Code Usage ✅
**File**: `server/src/controller/user.controller.js` (Lines 49-50)

Returns 200 for user creation (should be 201).

### 14. Logic Error in Address Update 
**File**: `server/src/controller/user.address.controller.js` (Lines 65-76)

Logic is inverted - returns success message when update fails.

### 15. Missing Await Statement 
**File**: `server/src/services/user.auth.service.js` (Line 46)

```javascript
res.save();  // Should be: await res.save();
```

### 16. Service Layer Returns Express Response ✅
**File**: `server/src/services/user.auth.service.js` (Lines 93-102)

Service layer tries to use `res` which doesn't exist in scope.

### 17. Logical Operator Misuse ✅
**File**: `server/src/services/user.cart.service.js` (Line 227)

```javascript
if (!productId && (quantity === undefined) & !action) {
                                           ^ Should be &&
```

### 18. Console.log in Production Code
**Count**: 22 instances across multiple files

**Fix**: Replace with Winston:
```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

---

## MongoDB Best Practices

### 19. Cart Schema - Inefficient Map Structure
**File**: `server/src/model/user.cart.model.js`

Maps don't support proper indexing.

**Better Approach**:
```javascript
const cartItemSchema = new mongoose.Schema({
  productId: { type: String, required: true, ref: 'Product' },
  quantity: { type: Number, required: true, min: 1, default: 1 }
}, { _id: false });

const cartSchema = mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  items: [cartItemSchema],
  updatedAt: { type: Date, default: Date.now }
});

cartSchema.index({ userId: 1, 'items.productId': 1 });
```

### 20. No TTL Index for OTP Cleanup ✅
**File**: `server/src/model/user.model.js`

Add TTL index:
```javascript
userSchema.index(
  { verificationOtpExpiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { verificationOtpExpiresAt: { $exists: true } } }
);
```

---

## Express.js & API Design Issues

### 21. CORS Configuration Risk 
**File**: `server/src/app.js` (Lines 19-31)

Accepts any origin if `origin` is undefined.

**Fix**:
```javascript
origin: function (origin, callback) {
  if (!origin && process.env.NODE_ENV === 'development') {
    return callback(null, true);
  }

  if (!origin) {
    return callback(new Error('Origin header missing'));
  }

  if (whiteListClientUrl.includes(origin.trim())) {
    callback(null, true);
  } else {
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  }
}
```

### 22. Missing Rate Limiting ✅
Add express-rate-limit:
```javascript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later'
});

app.post('/api/v1/user/login', authLimiter, userLogin);
app.post('/api/v1/user/register', authLimiter, userRegister);
```

### 23. Missing Helmet.js Security Headers
**File**: `server/src/app.js`

Add:
```javascript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### 24. Admin Route Lacks Protection ✅
**File**: `server/src/routes/admin.route.js` (Line 15)

```javascript
// CURRENT - Public route!
adminRouter.route("/admin/totalproducts").get(totalProducts);

// FIX
adminRouter.route("/admin/totalproducts").get(authGuardService("Admin"), totalProducts);
```

### 25. Missing Health Check Endpoint ✅
Add:
```javascript
router.get('/health', async (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    checks: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    }
  };
  res.status(200).json(healthcheck);
});
```

---

## Summary

### Issue Distribution
| Severity | Count |
|----------|-------|
| Critical | 6 |
| High | 3 |
| Medium | 9 |
| Low | 7 |

### Priority Roadmap

**Week 1 - Critical Fixes**
1. Add password hashing to Admin model
2. Replace Base64 token with JWT for account deletion
3. Fix webhook signature verification
4. Add input validation to all admin endpoints
5. Fix undefined variable references and missing imports

**Week 2 - Security Hardening**
6. Add rate limiting
7. Implement Helmet.js
8. Add request validation middleware
9. Add MongoDB indexes

**Week 3 - Performance & Quality**
10. Optimize cart preview query
11. Add connection pooling configuration
12. Replace console.log with Winston
13. Fix email service bugs
14. Standardize error responses

**Week 4 - Best Practices**
15. Refactor Cart schema
16. Add schema validation
17. Implement health check
18. Add API documentation (Swagger)
19. Write unit tests for critical paths

---

## Environment Variables Template

Create `.env.example`:
```bash
# Server
NODE_ENV=development
PORT=8000

# Database
DB_URI_PROD=mongodb://localhost:27017
DB_NAME=un

# JWT Secrets
USER_ACCESS_TOKEN_SECRET=
ADMIN_ACCESS_TOKEN_SECRET=
REFRESH_TOKEN_SECRET=
DELETION_TOKEN_SECRET=

# Razorpay
RP_LOCAL_TEST_KEY_ID=
RP_LOCAL_TEST_SECRET=
RP_WEBHOOK_TEST_SECRET=

# Email
ZOHO_ADMIN_EMAIL=
ZOHO_SMTP_SECRET=

# CORS
WHITE_LIST_CLIENT_URI=http://localhost:3000,https://yourdomain.com
```
