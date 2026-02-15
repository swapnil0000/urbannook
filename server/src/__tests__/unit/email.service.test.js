import { jest } from '@jest/globals';

// Mock nodemailer before importing the service
const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn(() => ({
  sendMail: mockSendMail
}));

jest.unstable_mockModule('nodemailer', () => ({
  default: {
    createTransport: mockCreateTransport
  }
}));

// Import service after mocking
const { 
  sendOrderConfirmation,
  sendPaymentReceipt,
  sendOTP,
  sendWelcomeEmail,
  sendOrderStatusUpdate
} = await import('../../services/email.service.js');

describe('Email Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set required environment variables
    process.env.ZOHO_ADMIN_EMAIL = 'test@urbannook.com';
    process.env.ZOHO_SMTP_SECRET = 'test-secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendOrderConfirmation', () => {
    it('should send order confirmation email successfully', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: 'test-message-id' });

      const orderDetails = {
        orderId: 'ORD123',
        items: [
          { productName: 'Test Product', quantity: 2, price: 500 }
        ],
        total: 1000,
        deliveryAddress: {
          name: 'John Doe',
          addressLine1: '123 Test St',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          phone: '9876543210'
        }
      };

      const result = await sendOrderConfirmation('user@example.com', orderDetails);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.message).toContain('user@example.com');
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.to).toBe('user@example.com');
      expect(callArgs.subject).toBe('Order Confirmed - #ORD123');
      expect(callArgs.html).toContain('ORD123');
      expect(callArgs.html).toContain('Test Product');
    });

    it('should include delivery address in email template', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: 'test-message-id' });

      const orderDetails = {
        orderId: 'ORD456',
        items: [{ productName: 'Product', quantity: 1, price: 200 }],
        total: 200,
        deliveryAddress: {
          name: 'Jane Smith',
          addressLine1: '456 Main Rd',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001'
        }
      };

      await sendOrderConfirmation('jane@example.com', orderDetails);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Jane Smith');
      expect(callArgs.html).toContain('456 Main Rd');
      expect(callArgs.html).toContain('Delhi');
    });

    it('should retry on failure and succeed on second attempt', async () => {
      mockSendMail
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ messageId: 'test-message-id' });

      const orderDetails = {
        orderId: 'ORD789',
        items: [{ productName: 'Product', quantity: 1, price: 100 }],
        total: 100
      };

      const result = await sendOrderConfirmation('user@example.com', orderDetails);

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      mockSendMail.mockRejectedValue(new Error('Persistent network error'));

      const orderDetails = {
        orderId: 'ORD999',
        items: [{ productName: 'Product', quantity: 1, price: 100 }],
        total: 100
      };

      const result = await sendOrderConfirmation('user@example.com', orderDetails);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.message).toContain('Failed to send email after 3 attempts');
      expect(mockSendMail).toHaveBeenCalledTimes(3);
    });
  });

  describe('sendPaymentReceipt', () => {
    it('should send payment receipt email successfully', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: 'test-message-id' });

      const paymentDetails = {
        paymentId: 'PAY123',
        amount: 1500,
        orderId: 'ORD123',
        date: new Date('2026-02-15'),
        paymentMethod: 'Razorpay'
      };

      const result = await sendPaymentReceipt('user@example.com', paymentDetails);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.to).toBe('user@example.com');
      expect(callArgs.subject).toBe('Payment Receipt - ₹1500');
      expect(callArgs.html).toContain('PAY123');
      expect(callArgs.html).toContain('1500');
      expect(callArgs.html).toContain('ORD123');
    });

    it('should handle missing date by using current date', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: 'test-message-id' });

      const paymentDetails = {
        paymentId: 'PAY456',
        amount: 2000,
        orderId: 'ORD456'
      };

      const result = await sendPaymentReceipt('user@example.com', paymentDetails);

      expect(result.success).toBe(true);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('PAY456');
    });

    it('should retry on failure', async () => {
      mockSendMail
        .mockRejectedValueOnce(new Error('SMTP error'))
        .mockRejectedValueOnce(new Error('SMTP error'))
        .mockResolvedValueOnce({ messageId: 'test-message-id' });

      const paymentDetails = {
        paymentId: 'PAY789',
        amount: 500,
        orderId: 'ORD789'
      };

      const result = await sendPaymentReceipt('user@example.com', paymentDetails);

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledTimes(3);
    });
  });

  describe('sendOTP', () => {
    it('should send OTP email successfully', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: 'test-message-id' });

      const result = await sendOTP('user@example.com', '123456');

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.to).toBe('user@example.com');
      expect(callArgs.subject).toBe('Password Reset OTP - Urban Nook');
      expect(callArgs.html).toContain('123456');
      expect(callArgs.html).toContain('10 minutes');
    });

    it('should include security warning in OTP email', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: 'test-message-id' });

      await sendOTP('user@example.com', '654321');

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Security Notice');
      expect(callArgs.html).toContain('Never share this OTP');
    });

    it('should retry on failure', async () => {
      mockSendMail
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValueOnce({ messageId: 'test-message-id' });

      const result = await sendOTP('user@example.com', '111111');

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email successfully', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: 'test-message-id' });

      const result = await sendWelcomeEmail('user@example.com', 'John Doe');

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.to).toBe('user@example.com');
      expect(callArgs.subject).toBe('Welcome to Urban Nook!');
      expect(callArgs.html).toContain('John Doe');
      expect(callArgs.html).toContain('Welcome to UrbanNook');
    });

    it('should include getting started information', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: 'test-message-id' });

      await sendWelcomeEmail('user@example.com', 'Jane Smith');

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Browse our collection');
      expect(callArgs.html).toContain('Start Shopping');
    });

    it('should retry on failure', async () => {
      mockSendMail
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValueOnce({ messageId: 'test-message-id' });

      const result = await sendWelcomeEmail('user@example.com', 'Test User');

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendOrderStatusUpdate', () => {
    it('should send order status update email for CONFIRMED status', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: 'test-message-id' });

      const result = await sendOrderStatusUpdate('user@example.com', 'ORD123', 'CONFIRMED');

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.to).toBe('user@example.com');
      expect(callArgs.subject).toBe('Order Update - #ORD123');
      expect(callArgs.html).toContain('ORD123');
      expect(callArgs.html).toContain('Order Confirmed');
    });

    it('should send order status update email for SHIPPED status', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: 'test-message-id' });

      await sendOrderStatusUpdate('user@example.com', 'ORD456', 'SHIPPED');

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Order Shipped');
      expect(callArgs.html).toContain('on its way');
    });

    it('should send order status update email for DELIVERED status', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: 'test-message-id' });

      await sendOrderStatusUpdate('user@example.com', 'ORD789', 'DELIVERED');

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Order Delivered');
      expect(callArgs.html).toContain('delivered');
    });

    it('should send order status update email for CANCELLED status', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: 'test-message-id' });

      await sendOrderStatusUpdate('user@example.com', 'ORD999', 'CANCELLED');

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Order Cancelled');
      expect(callArgs.html).toContain('cancelled');
    });

    it('should retry on failure', async () => {
      mockSendMail
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ messageId: 'test-message-id' });

      const result = await sendOrderStatusUpdate('user@example.com', 'ORD111', 'PROCESSING');

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledTimes(2);
    });
  });

  describe('Retry Logic', () => {
    it('should implement exponential backoff between retries', async () => {
      const startTime = Date.now();
      mockSendMail
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce({ messageId: 'test-message-id' });

      await sendOTP('user@example.com', '123456');

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should wait at least 1000ms (1st retry) + 2000ms (2nd retry) = 3000ms
      expect(duration).toBeGreaterThanOrEqual(3000);
      expect(mockSendMail).toHaveBeenCalledTimes(3);
    });

    it('should stop retrying after max attempts', async () => {
      mockSendMail.mockRejectedValue(new Error('Persistent error'));

      const result = await sendWelcomeEmail('user@example.com', 'Test User');

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(mockSendMail).toHaveBeenCalledTimes(3);
    });
  });

  describe('Email Template Rendering', () => {
    it('should render order confirmation template with all order details', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: 'test-message-id' });

      const orderDetails = {
        orderId: 'ORD-FULL-123',
        items: [
          { productName: 'Product A', quantity: 2, price: 500 },
          { productName: 'Product B', quantity: 1, price: 1000 }
        ],
        total: 2000,
        deliveryAddress: {
          name: 'Complete Name',
          addressLine1: 'Line 1',
          addressLine2: 'Line 2',
          city: 'City',
          state: 'State',
          pincode: '123456',
          phone: '1234567890'
        }
      };

      await sendOrderConfirmation('user@example.com', orderDetails);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Product A');
      expect(callArgs.html).toContain('Product B');
      expect(callArgs.html).toContain('2000');
      expect(callArgs.html).toContain('Complete Name');
      expect(callArgs.html).toContain('Line 2');
    });

    it('should render payment receipt template with formatted date', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: 'test-message-id' });

      const paymentDetails = {
        paymentId: 'PAY-DATE-123',
        amount: 3000,
        orderId: 'ORD-DATE-123',
        date: new Date('2026-02-15T10:30:00'),
        paymentMethod: 'Credit Card'
      };

      await sendPaymentReceipt('user@example.com', paymentDetails);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('PAY-DATE-123');
      expect(callArgs.html).toContain('3000');
      expect(callArgs.html).toContain('Credit Card');
      // Date should be formatted
      expect(callArgs.html).toMatch(/February|15|2026/);
    });

    it('should render OTP template with OTP code', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: 'test-message-id' });

      await sendOTP('user@example.com', '987654');

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('987654');
      expect(callArgs.html).toContain('Password Reset Request');
    });

    it('should render welcome template with user name', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: 'test-message-id' });

      await sendWelcomeEmail('user@example.com', 'Alice Johnson');

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Alice Johnson');
      expect(callArgs.html).toContain('Welcome to UrbanNook');
    });

    it('should render order status template with correct status', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: 'test-message-id' });

      await sendOrderStatusUpdate('user@example.com', 'ORD-STATUS-123', 'PROCESSING');

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('ORD-STATUS-123');
      expect(callArgs.html).toContain('Order Processing');
    });
  });
});
