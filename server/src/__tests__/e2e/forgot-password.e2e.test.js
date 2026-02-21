/**
 * E2E Test: Forgot Password Flow
 * 
 * Tests the complete password reset flow with OTP verification:
 * - OTP request
 * - OTP verification and password reset
 * - OTP invalidation
 * - Login with new password
 * 
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app.js';
import User from '../../model/user.model.js';
import OTP from '../../model/otp.model.js';

describe('E2E: Forgot Password Flow', () => {
  let testUser;
  let testEmail;
  let generatedOTP;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/urbannook-test');
    }

    // Create a test user
    testEmail = `forgot-pwd-test-${Date.now()}@example.com`;
    testUser = await User.create({
      name: 'Forgot Password Test User',
      email: testEmail,
      password: 'OldPassword123!',
      mobileNumber: '9876543210',
      userId: `USER-${Date.now()}`,
    });
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUser) {
      await User.deleteOne({ email: testEmail });
    }
    await OTP.deleteMany({ email: testEmail });
    
    // Close database connection
    await mongoose.connection.close();
  });

  describe('Step 1: OTP Request', () => {
    it('should request password reset and send OTP', async () => {
      const response = await request(app)
        .post('/api/v1/user/forgot-password/request')
        .send({ email: testEmail })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('OTP');
    });

    it('should create OTP record in database', async () => {
      const otpRecord = await OTP.findOne({ email: testEmail });
      expect(otpRecord).toBeDefined();
      expect(otpRecord.otp).toBeDefined();
      expect(otpRecord.expiresAt).toBeDefined();
      expect(otpRecord.attempts).toBe(0);

      // Store OTP for next test (in real scenario, user gets this via email)
      // For testing, we'll retrieve it from database
      generatedOTP = otpRecord.otp;
    });

    it('should reject OTP request for non-existent email', async () => {
      const response = await request(app)
        .post('/api/v1/user/forgot-password/request')
        .send({ email: 'nonexistent@example.com' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should reject OTP request with invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/user/forgot-password/request')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Step 2: OTP Verification and Password Reset', () => {
    it('should reject invalid OTP', async () => {
      const response = await request(app)
        .post('/api/v1/user/forgot-password/reset')
        .send({
          email: testEmail,
          otp: '000000',
          newPassword: 'NewPassword123!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });

    it('should increment failed attempt counter', async () => {
      const otpRecord = await OTP.findOne({ email: testEmail });
      expect(otpRecord.attempts).toBe(1);
    });

    it('should reset password with valid OTP', async () => {
      // Get the actual OTP from database (simulating email retrieval)
      const otpRecord = await OTP.findOne({ email: testEmail });
      
      // For testing purposes, we need to get the plain OTP
      // In production, the OTP is sent via email
      // Here we'll use a known OTP by creating a new one
      const testOTP = '123456';
      const bcrypt = (await import('bcrypt')).default;
      const hashedOTP = await bcrypt.hash(testOTP, 10);
      
      await OTP.updateOne(
        { email: testEmail },
        { 
          $set: { 
            otp: hashedOTP,
            attempts: 0,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000)
          } 
        }
      );

      const response = await request(app)
        .post('/api/v1/user/forgot-password/reset')
        .send({
          email: testEmail,
          otp: testOTP,
          newPassword: 'NewPassword123!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset');
    });

    it('should update user password in database', async () => {
      const user = await User.findOne({ email: testEmail });
      expect(user).toBeDefined();
      
      // Verify password was changed (can't check exact value due to hashing)
      const bcrypt = (await import('bcrypt')).default;
      const isMatch = await bcrypt.compare('NewPassword123!', user.password);
      expect(isMatch).toBe(true);
    });
  });

  describe('Step 3: OTP Invalidation', () => {
    it('should invalidate OTP after successful use', async () => {
      const otpRecord = await OTP.findOne({ email: testEmail });
      
      // OTP should either be deleted or marked as used
      // Based on implementation, it might be deleted
      if (otpRecord) {
        expect(otpRecord.expiresAt.getTime()).toBeLessThan(Date.now());
      }
    });

    it('should reject reuse of same OTP', async () => {
      const response = await request(app)
        .post('/api/v1/user/forgot-password/reset')
        .send({
          email: testEmail,
          otp: '123456',
          newPassword: 'AnotherPassword123!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Step 4: Login with New Password', () => {
    it('should reject login with old password', async () => {
      const response = await request(app)
        .post('/api/v1/user/login')
        .send({
          email: testEmail,
          password: 'OldPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should successfully login with new password', async () => {
      const response = await request(app)
        .post('/api/v1/user/login')
        .send({
          email: testEmail,
          password: 'NewPassword123!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('userAccessToken');
      expect(response.body.data.email).toBe(testEmail);
    });

    it('should set authentication cookie on login', async () => {
      const response = await request(app)
        .post('/api/v1/user/login')
        .send({
          email: testEmail,
          password: 'NewPassword123!',
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(cookie => cookie.includes('userAccessToken'))).toBe(true);
    });
  });

  describe('Step 5: Account Locking After Failed Attempts', () => {
    beforeAll(async () => {
      // Request new OTP for testing account locking
      await request(app)
        .post('/api/v1/user/forgot-password/request')
        .send({ email: testEmail })
        .expect(200);
    });

    it('should lock account after 3 failed OTP attempts', async () => {
      // Attempt 1
      await request(app)
        .post('/api/v1/user/forgot-password/reset')
        .send({
          email: testEmail,
          otp: '111111',
          newPassword: 'TestPassword123!',
        })
        .expect(400);

      // Attempt 2
      await request(app)
        .post('/api/v1/user/forgot-password/reset')
        .send({
          email: testEmail,
          otp: '222222',
          newPassword: 'TestPassword123!',
        })
        .expect(400);

      // Attempt 3
      await request(app)
        .post('/api/v1/user/forgot-password/reset')
        .send({
          email: testEmail,
          otp: '333333',
          newPassword: 'TestPassword123!',
        })
        .expect(400);

      // Verify account is locked
      const otpRecord = await OTP.findOne({ email: testEmail });
      expect(otpRecord.attempts).toBeGreaterThanOrEqual(3);
      
      if (otpRecord.lockedUntil) {
        expect(otpRecord.lockedUntil.getTime()).toBeGreaterThan(Date.now());
      }
    });

    it('should reject OTP verification when account is locked', async () => {
      const response = await request(app)
        .post('/api/v1/user/forgot-password/reset')
        .send({
          email: testEmail,
          otp: '123456',
          newPassword: 'TestPassword123!',
        })
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('locked');
    });
  });

  describe('Step 6: OTP Expiration', () => {
    it('should reject expired OTP', async () => {
      // Create an expired OTP
      const testOTP = '999999';
      const bcrypt = (await import('bcrypt')).default;
      const hashedOTP = await bcrypt.hash(testOTP, 10);
      
      await OTP.create({
        email: `expired-${Date.now()}@example.com`,
        otp: hashedOTP,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        attempts: 0,
      });

      const response = await request(app)
        .post('/api/v1/user/forgot-password/reset')
        .send({
          email: `expired-${Date.now()}@example.com`,
          otp: testOTP,
          newPassword: 'TestPassword123!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('expired');
    });
  });
});
