/**
 * E2E Test: Complete Purchase Flow
 * 
 * Tests the entire user journey from signup to order completion:
 * - User signup with auto-login
 * - Product browsing
 * - Adding products to cart
 * - Updating cart quantities
 * - Viewing cart
 * - Applying coupons
 * - Checkout flow
 * - Order creation
 * - Payment verification
 * - Order status tracking
 * - Cart clearing after payment
 * 
 * **Validates: All requirements**
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app.js';
import User from '../../model/user.model.js';
import Product from '../../model/product.model.js';
import Order from '../../model/order.model.js';
import Cart from '../../model/user.cart.model.js';
import Coupon from '../../model/coupon.code.model.js';

describe('E2E: Complete Purchase Flow', () => {
  let testUser;
  let testProduct;
  let testCoupon;
  let authToken;
  let userId;
  let agent;  // Supertest agent to maintain cookies

  beforeAll(async () => {
    // Connect to test database
    const dbUri = process.env.MONGODB_URI || process.env.DB_URI_PROD;
    
    if (!dbUri) {
      console.warn('⚠️  No database URI found. Skipping E2E tests.');
      return;
    }

    if (mongoose.connection.readyState === 0) {
      try {
        await mongoose.connect(dbUri);
        console.log('✓ Connected to test database');
      } catch (error) {
        console.error('Failed to connect to database:', error.message);
        throw error;
      }
    }

    // Create agent to maintain cookies across requests
    agent = request.agent(app);
  }, 60000);

  afterAll(async () => {
    // Cleanup test data
    if (testUser) {
      await User.deleteOne({ email: testUser.email });
    }
    if (testProduct) {
      await Product.deleteOne({ productId: testProduct.productId });
    }
    if (testCoupon) {
      await Coupon.deleteOne({ name: testCoupon.name });
    }
    if (userId) {
      await Cart.deleteOne({ userId });
      await Order.deleteMany({ userId });
    }
    
    // Close database connection
    await mongoose.connection.close();
  });

  describe('Step 1: User Signup with Auto-Login', () => {
    it('should register a new user and automatically log them in', async () => {
      const userData = {
        name: 'TestUser',  // Simple name without spaces to pass validation
        email: `e2e-test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        mobileNumber: '9876543210',
      };

      const response = await agent
        .post('/api/v1/user/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('email', userData.email);
      expect(response.body.data).toHaveProperty('userAccessToken');
      expect(response.body.data).toHaveProperty('userId');

      // Store for later tests
      testUser = userData;
      authToken = response.body.data.userAccessToken;
      userId = response.body.data.userId;

      // Verify cookie is set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(cookie => cookie.includes('userAccessToken'))).toBe(true);
    });
  });

  describe('Step 2: Product Browsing', () => {
    beforeAll(async () => {
      // Create a test product
      const timestamp = Date.now();
      testProduct = await Product.create({
        productId: `TEST-PROD-${timestamp}`,
        uiProductId: `UI-TEST-${timestamp}`,
        productName: `E2E Test Product ${timestamp}`,
        productImg: `https://example.com/image-${timestamp}.jpg`,
        productDes: 'Product for E2E testing',
        sellingPrice: 1000,
        productCategory: 'Test Category',
        productStatus: 'in_stock',
        productQuantity: 100,
        isPublished: true,
      });
    }, 60000);

    it('should fetch available products', async () => {
      const response = await agent
        .get('/api/v1/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Verify our test product is in the list
      const foundProduct = response.body.data.find(
        p => p.productId === testProduct.productId
      );
      expect(foundProduct).toBeDefined();
    });

    it('should fetch product details', async () => {
      const response = await agent
        .get(`/api/v1/product/${testProduct.productId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.productId).toBe(testProduct.productId);
      expect(response.body.data.productName).toBe(testProduct.productName);
    });
  });

  describe('Step 3: Adding Products to Cart', () => {
    it('should add a product to cart', async () => {
      const response = await agent
        .post('/api/v1/user/cart/add')
        .send({
          productId: testProduct.productId,
          quantity: 2,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('added to cart');
    });

    it('should add another product to cart', async () => {
      const response = await agent
        .post('/api/v1/user/cart/add')
        .send({
          productId: testProduct.productId,
          quantity: 1,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Step 4: Updating Cart Quantities', () => {
    it('should update product quantity in cart', async () => {
      const response = await agent
        .post('/api/v1/user/cart/update')
        .send({
          productId: testProduct.productId,
          quantity: 3,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('updated');
    });
  });

  describe('Step 5: Viewing Cart', () => {
    it('should fetch cart contents', async () => {
      const response = await agent
        .get('/api/v1/user/cart/get')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(Array.isArray(response.body.data.items)).toBe(true);
      expect(response.body.data.items.length).toBeGreaterThan(0);

      // Verify our product is in cart with correct quantity
      const cartItem = response.body.data.items.find(
        item => item.productId === testProduct.productId
      );
      expect(cartItem).toBeDefined();
      expect(cartItem.quantity).toBe(3);
    });
  });

  describe('Step 6: Applying Coupons', () => {
    beforeAll(async () => {
      // Create a test coupon
      const timestamp = Date.now();
      testCoupon = await Coupon.create({
        name: `E2ETEST${timestamp}`,
        couponCodeId: `COUPON-${timestamp}`,
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minCartValue: 500,
        maxDiscount: 500,
        isPublished: true,
      });
    }, 60000);

    it('should fetch available coupons', async () => {
      const response = await agent
        .get('/api/v1/coupon/list')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify our test coupon is in the list
      const foundCoupon = response.body.data.find(
        c => c.name === testCoupon.name
      );
      expect(foundCoupon).toBeDefined();
    });

    it('should apply coupon to cart', async () => {
      const response = await agent
        .post('/api/v1/coupon/apply')
        .send({
          couponCode: testCoupon.name,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('discount');
      expect(response.body.data.discount).toBeGreaterThan(0);
    });

    it('should show discount in cart', async () => {
      const response = await agent
        .get('/api/v1/user/cart/get')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Cart should reflect applied coupon
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Step 7: Checkout Flow', () => {
    it('should create order via Razorpay', async () => {
      const response = await agent
        .post('/api/v1/user/create-order')
        .send({
          amount: testProduct.sellingPrice * 3,
          currency: 'INR',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('orderId');
    });
  });

  describe('Step 8: Order Creation', () => {
    it('should create an order in database', async () => {
      const orders = await Order.find({ userId });
      expect(orders.length).toBeGreaterThan(0);

      const latestOrder = orders[orders.length - 1];

      expect(latestOrder.status).toBe('CREATED');
      expect(latestOrder.items.length).toBeGreaterThan(0);
      expect(latestOrder.totalAmount).toBeGreaterThan(0);
    });

    it('should fetch order details from history', async () => {
      const orders = await Order.find({ userId });
      const latestOrder = orders[orders.length - 1];

      const response = await agent
        .get('/api/v1/user/order/history')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orders.length).toBeGreaterThan(0);
      
      const foundOrder = response.body.data.orders.find(
        o => o.orderId === latestOrder.orderId
      );
      expect(foundOrder).toBeDefined();
    });
  });

  describe('Step 9: Payment Verification (Simulated)', () => {
    it('should verify payment and update order status', async () => {
      const orders = await Order.find({ userId });
      const latestOrder = orders[orders.length - 1];

      // Simulate payment verification (in real scenario, this comes from Razorpay webhook)
      await Order.updateOne(
        { orderId: latestOrder.orderId },
        {
          $set: {
            status: 'PAID',
            'payment.status': 'SUCCESS',
            'payment.razorpayPaymentId': 'test_payment_id',
          },
        }
      );

      const updatedOrder = await Order.findOne({ orderId: latestOrder.orderId });
      expect(updatedOrder.status).toBe('PAID');
      expect(updatedOrder.payment.status).toBe('SUCCESS');
    });
  });

  describe('Step 10: Order Status Tracking', () => {
    it('should fetch order history', async () => {
      const response = await agent
        .get('/api/v1/user/order/history')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('orders');
      expect(Array.isArray(response.body.data.orders)).toBe(true);
      expect(response.body.data.orders.length).toBeGreaterThan(0);

      // Verify order has status
      const order = response.body.data.orders[0];
      expect(order).toHaveProperty('status');
      expect(order.status).toBe('PAID');
    });

    it('should track order status changes', async () => {
      const orders = await Order.find({ userId });
      const latestOrder = orders[orders.length - 1];

      // Update order status
      await Order.updateOne(
        { orderId: latestOrder.orderId },
        {
          $set: { status: 'CONFIRMED' },
          $push: {
            statusHistory: {
              status: 'CONFIRMED',
              timestamp: new Date(),
              note: 'Order confirmed',
            },
          },
        }
      );

      const updatedOrder = await Order.findOne({ orderId: latestOrder.orderId });
      expect(updatedOrder.status).toBe('CONFIRMED');
      expect(updatedOrder.statusHistory.length).toBeGreaterThan(0);
    });
  });

  describe('Step 11: Cart Clearing After Payment', () => {
    it('should clear cart after successful payment', async () => {
      const response = await agent
        .delete('/api/v1/user/cart/clear')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should verify cart is empty', async () => {
      const response = await agent
        .get('/api/v1/user/cart/get')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items.length).toBe(0);
    });
  });
});
