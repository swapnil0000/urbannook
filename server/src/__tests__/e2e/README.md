# End-to-End Tests

This directory contains comprehensive E2E tests that validate complete user workflows from start to finish.

## Test Files

### 1. `purchase-flow.e2e.test.js`
Tests the complete purchase journey:
- User signup with auto-login
- Product browsing
- Adding products to cart
- Updating cart quantities
- Viewing cart
- Applying coupons
- Checkout flow
- Order creation
- Payment verification (simulated)
- Order status tracking
- Cart clearing after payment

**Validates:** All requirements

### 2. `forgot-password.e2e.test.js`
Tests the password reset flow with OTP verification:
- OTP request
- OTP verification and password reset
- OTP invalidation
- Login with new password
- Account locking after failed attempts
- OTP expiration handling

**Validates:** Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6

## Running E2E Tests

### Run all E2E tests:
```bash
cd server
npm test -- e2e
```

### Run specific E2E test:
```bash
npm test -- purchase-flow.e2e.test.js
npm test -- forgot-password.e2e.test.js
```

### Run with coverage:
```bash
npm run test:coverage -- e2e
```

## Prerequisites

1. **MongoDB**: Ensure MongoDB is running and accessible
2. **Environment Variables**: Set up `.env` file with required variables:
   - `MONGODB_URI` - Test database connection string
   - `JWT_SECRET` - JWT signing secret
   - Other required environment variables

3. **Test Database**: E2E tests use a test database (default: `urbannook-test`)
   - Tests create and clean up their own data
   - Safe to run multiple times

## Test Structure

Each E2E test follows this pattern:

1. **Setup** (`beforeAll`): 
   - Connect to test database
   - Create test data (users, products, coupons)

2. **Test Steps**: 
   - Sequential test cases simulating user actions
   - Each step builds on previous steps
   - Tests verify both API responses and database state

3. **Cleanup** (`afterAll`):
   - Remove test data
   - Close database connection

## Notes

- E2E tests have a 30-second timeout (configured in `jest.config.js`)
- Tests are marked as optional in the task list (can be skipped for faster MVP)
- Tests use `supertest` for HTTP requests
- Tests verify both success and error scenarios
- Payment verification is simulated (no actual Razorpay calls)

## Troubleshooting

### Tests fail with "Connection refused"
- Ensure MongoDB is running
- Check `MONGODB_URI` in `.env`

### Tests timeout
- Increase timeout in `jest.config.js`
- Check database connection speed
- Verify no long-running operations

### Tests fail with "User already exists"
- Test cleanup may have failed
- Manually clean test database
- Tests use timestamp-based unique identifiers to avoid conflicts
