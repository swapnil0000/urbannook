# UrbanNook Server Code Review

## Overview
Comprehensive code review of the Node.js/MongoDB e-commerce backend with security vulnerabilities, performance optimizations, and best practices.

---

## Critical Security Vulnerabilities

### 1. ✅ COMPLETED - Admin Password Storage Without Hashing
**File**: `server/src/model/admin.model.js`

~~The Admin model lacks a `pre('save')` hook for password hashing, unlike the User model. Admin passwords are stored in plain text.~~

**Fix Applied**: Pre-save hook with bcrypt hashing now exists (lines 23-27).

### 2. ⚠️ PARTIALLY FIXED - Insecure Account Deletion Token
**File**: `server/src/controller/user.controller.js` (Lines 279-357)

~~Account deletion uses Base64 encoding (NOT encryption) for "confirmation tokens".~~

**Status**: `userAccountDeletePreview` now uses JWT (lines 299-303), BUT:
- **Bug**: `jwt` is NOT imported in the file - will throw ReferenceError
- **Bug**: `email` variable is undefined - should be `userDetails.email`
- **Bug**: `userAccountDeleteConfirm` (line 343) still decodes with Base64 instead of JWT verification

### 3. ❌ NOT FIXED - Missing Input Validation on Admin Product Creation
**File**: `server/src/controller/admin.controller.js` (Lines 71-99)

`createProduct` still accepts user input without Joi validation, risking NoSQL injection and malformed data.

**Fix Required**: Add Joi validation schema.

### 4. ✅ COMPLETED - Webhook Signature Verification Bug
**File**: `server/src/controller/rp.payment.controller.js` (Lines 152-177)

~~Double signature verification with incorrect logic - redundant and potentially faulty.~~

**Fix Applied**: Single proper signature verification now in place (lines 153-177).

### 5. ⚠️ PARTIALLY FIXED - Undefined Variable References
**File**: `server/src/controller/user.controller.js`

~~Multiple references to undefined `email` variable in scope.~~

**Status**: Most fixed, but `userAccountDeletePreview` (line 300, 310) still uses undefined `email` - should be `userDetails.email`.

### 6. ✅ COMPLETED - Missing bcrypt Import
**File**: `server/src/controller/user.controller.js`

~~`bcrypt.compare()` used but bcrypt not imported.~~

**Fix Applied**: bcrypt is now imported at line 13.

---

## High Priority Performance Issues

### 7. ✅ COMPLETED - Missing Database Indexes
**Files**: Multiple model files

~~Add critical indexes.~~

**Fix Applied**:
- `user.model.js`: indexes on userId, email, mobileNumber, verificationOtp, TTL index (lines 52-62)
- `order.model.js`: indexes on userId+status, razorpayOrderId, createdAt (lines 64-66)
- `user.cart.model.js`: unique index on userId (line 14)
- `user.wishlist.model.js`: unique index on userId (line 9)

### 8. ✅ COMPLETED - Inefficient Product Listing Query
**File**: `server/src/controller/product.controller.js` (Lines 11-23)

~~Uses case-insensitive regex without text index.~~

**Fix Applied**: Now uses `$text` search for longer inputs (>2 chars) with text score sorting (lines 19-22). Short inputs still use regex for prefix matching.

### 9. ✅ COMPLETED - No Connection Pooling Configuration
**File**: `server/src/db/conn.js`

~~No connection pooling configuration.~~

**Fix Applied**: Connection pooling configured with maxPoolSize: 10, minPoolSize: 2, socketTimeoutMS: 45000 (lines 6-11). Error and disconnection handlers also added (lines 14-19).

---

## Medium Priority Code Quality Issues

### 10. ❌ NOT FIXED - Inconsistent Error Handling Patterns
Mix of `return res.status()` and `return new ApiError()` still exists:

**Still present in**:
- `admin.controller.js` line 49: `return new ApiError(...)` without `res.status().json()`
- `admin.controller.js` line 208: same issue

### 11. ⚠️ PARTIALLY FIXED - DRY Violation - Duplicate Email Transporter
**Files**: `server/src/services/email.service.js`, `server/src/controller/user.community.controller.js`

**Status**:
- ✅ `email.service.js` now has singleton pattern with `getNodeMailerTransporter()` (lines 3-17)
- ❌ `user.community.controller.js` still creates its own transporter (lines 58-66) instead of using the singleton

### 12. ✅ COMPLETED - Email Service Bugs
**File**: `server/src/services/email.service.js`

~~Syntax error and missing semicolon.~~

**Fix Applied**: Template string now correct `OTP sent to ${to}` (line 30), semicolons in place.

### 13. ✅ COMPLETED - Inconsistent Status Code Usage
**File**: `server/src/controller/user.controller.js`

~~Returns 200 for user creation (should be 201).~~

**Fix Applied**: Now returns 201 for user registration (line 53).

### 14. ⚠️ NEEDS REVIEW - Logic Error in Address Update
**File**: `server/src/controller/user.address.controller.js` (Lines 76-114)

Logic flow needs review - the error handling on `!userUpdatedAddressServiceValidation.success` appears correct, but service function call at line 81 is missing `await`.

### 15. ❌ NOT FIXED - Missing Await Statement
**File**: `server/src/services/user.auth.service.js` (Line 46)

Still missing await: `res.save();` should be `await res.save();`

### 16. ✅ COMPLETED - Service Layer Returns Express Response
**File**: `server/src/services/user.auth.service.js`

~~Service layer tries to use `res` which doesn't exist in scope.~~

**Fix Applied**: Service now returns objects with statusCode, message, data, success instead of using res directly.

### 17. ✅ COMPLETED - Logical Operator Misuse
**File**: `server/src/services/user.cart.service.js` (Line 241)

~~Used `&` instead of `&&`.~~

**Fix Applied**: Now uses correct logical AND operator `&&` (line 241).

### 18. ❌ NOT FIXED - Console.log in Production Code
**Count**: Multiple instances still exist

**Files with console.log**:
- `admin.controller.js` (line 114)
- `conn.js` (lines 5, 12)
- `rp.payment.controller.js` (lines 63, 210, 224, 233, 241)
- `user.cart.service.js` (lines 84, 222, 336)
- `user.community.controller.js` (lines 78, 109)
- `user.auth.service.js` (line 175)

**Fix Required**: Replace with Winston logger.

---

## MongoDB Best Practices

### 19. ❌ NOT FIXED - Cart Schema - Inefficient Map Structure
**File**: `server/src/model/user.cart.model.js`

Still uses Map structure which doesn't support proper indexing on product items.

**Current** (lines 8-11):
```javascript
products: {
  type: Map,
  of: Number,
  default: {},
}
```

**Fix Required**: Refactor to array-based schema for better indexing.

### 20. ✅ COMPLETED - No TTL Index for OTP Cleanup
**File**: `server/src/model/user.model.js`

~~No TTL index for OTP cleanup.~~

**Fix Applied**: TTL index with partialFilterExpression now exists (lines 56-62).

---

## Express.js & API Design Issues

### 21. ⚠️ PARTIALLY FIXED - CORS Configuration Risk
**File**: `server/src/app.js` (Lines 22-28)

Still accepts requests without origin header (`!origin` returns true in line 23).

**Current** (lines 22-28):
```javascript
origin: function (origin, callback) {
  if (!origin || whiteListClientUrl.includes(origin.trim())) {
    callback(null, true);
  } ...
}
```

**Fix Required**: Should reject missing origin in production environment.

### 22. ❌ NOT FIXED - Missing Rate Limiting

No rate limiting middleware implemented in `app.js`.

**Fix Required**: Add express-rate-limit for auth endpoints.

### 23. ❌ NOT FIXED - Missing Helmet.js Security Headers
**File**: `server/src/app.js`

No Helmet.js middleware implemented.

**Fix Required**: Add helmet for security headers.

### 24. ✅ COMPLETED - Admin Route Lacks Protection
**File**: `server/src/routes/admin.route.js` (Lines 15-17)

~~`/admin/totalproducts` was a public route without protection.~~

**Fix Applied**: Route now protected with `authGuardService("Admin")` middleware (line 17).

### 25. ✅ COMPLETED - Missing Health Check Endpoint
**File**: `server/src/routes/health.route.js`

~~No health check endpoint.~~

**Fix Applied**: Health check endpoint exists at `/api/v1/health` (see `health.route.js` and `app.js` line 35).

---

## Summary

### Issue Status Distribution
| Status | Count |
|--------|-------|
| ✅ Completed | 13 |
| ⚠️ Partial/Needs Review | 5 |
| ❌ Not Fixed | 7 |

### Completed Fixes (13)
1. Admin Password Storage (#1)
2. Webhook Signature Verification (#4)
3. Missing bcrypt Import (#6)
4. Database Indexes (#7)
5. Product Listing Query Optimization (#8)
6. Connection Pooling Configuration (#9)
7. Email Service Bugs (#12)
8. Status Code Usage (#13)
9. Service Layer Response Pattern (#16)
10. Logical Operator Fix (#17)
11. TTL Index for OTP (#20)
12. Admin Route Protection (#24)
13. Health Check Endpoint (#25)

### Partial/Needs Review (5)
1. Account Deletion Token - JWT added but has bugs (#2, #5)
2. DRY Email Transporter - singleton exists but not used everywhere (#11)
3. Address Update Logic - needs review (#14)
4. CORS Configuration - still allows missing origin (#21)

### Remaining Work (7)
1. ❌ Add Joi validation to admin endpoints (#3)
2. ❌ Fix inconsistent error handling pattern (#10)
3. ❌ Add await to user.auth.service.js line 46 (#15)
4. ❌ Replace console.log with Winston logger (#18)
5. ❌ Refactor Cart schema from Map to array (#19)
6. ❌ Add rate limiting (#22)
7. ❌ Add Helmet.js security headers (#23)

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
