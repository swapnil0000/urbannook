import { jest } from '@jest/globals';

// Mock dependencies
const mockOrderFindOne = jest.fn();
const mockOrderSave = jest.fn();
const mockSendOrderStatusUpdate = jest.fn();

jest.unstable_mockModule('../../model/order.model.js', () => ({
  default: {
    findOne: mockOrderFindOne
  }
}));

jest.unstable_mockModule('../../services/email.service.js', () => ({
  sendOrderStatusUpdate: mockSendOrderStatusUpdate
}));

// Import after mocking
const { updateOrderStatus } = await import('../../controller/user.cart.controller.js');

describe('Order Tracking Unit Tests', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockSendOrderStatusUpdate.mockResolvedValue({ success: true });
  });

  describe('updateOrderStatus', () => {
    describe('Validation', () => {
      it('should return 400 when orderId is missing', async () => {
        mockReq.body = { status: 'CONFIRMED' };

        await updateOrderStatus(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 400,
            message: 'Order ID and status are required',
            success: false
          })
        );
      });

      it('should return 400 when status is missing', async () => {
        mockReq.body = { orderId: 'ORD123' };

        await updateOrderStatus(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 400,
            message: 'Order ID and status are required',
            success: false
          })
        );
      });

      it('should return 400 when status is invalid', async () => {
        mockReq.body = { orderId: 'ORD123', status: 'INVALID_STATUS' };

        await updateOrderStatus(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 400,
            message: expect.stringContaining('Invalid status'),
            success: false
          })
        );
      });

      it('should accept all valid status values', async () => {
        const validStatuses = ['CREATED', 'PAID', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'FAILED'];

        for (const status of validStatuses) {
          jest.clearAllMocks();
          
          const mockOrder = {
            orderId: 'ORD123',
            userId: 'user@example.com',
            status: 'CREATED',
            statusHistory: [],
            trackingInfo: {},
            save: mockOrderSave
          };

          mockOrderFindOne.mockResolvedValue(mockOrder);
          mockOrderSave.mockResolvedValue(mockOrder);

          mockReq.body = { orderId: 'ORD123', status };

          await updateOrderStatus(mockReq, mockRes);

          expect(mockRes.status).toHaveBeenCalledWith(200);
        }
      });

      it('should return 404 when order is not found', async () => {
        mockReq.body = { orderId: 'NONEXISTENT', status: 'CONFIRMED' };
        mockOrderFindOne.mockResolvedValue(null);

        await updateOrderStatus(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 404,
            message: 'Order not found',
            success: false
          })
        );
      });
    });

    describe('Order Status Updates', () => {
      it('should update order status successfully', async () => {
        const mockOrder = {
          orderId: 'ORD123',
          userId: 'user@example.com',
          status: 'PAID',
          statusHistory: [],
          trackingInfo: {},
          save: mockOrderSave
        };

        mockOrderFindOne.mockResolvedValue(mockOrder);
        mockOrderSave.mockResolvedValue(mockOrder);

        mockReq.body = {
          orderId: 'ORD123',
          status: 'CONFIRMED',
          note: 'Order confirmed by admin'
        };

        await updateOrderStatus(mockReq, mockRes);

        expect(mockOrder.status).toBe('CONFIRMED');
        expect(mockOrderSave).toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 200,
            message: 'Order status updated successfully',
            success: true
          })
        );
      });

      it('should update status from CONFIRMED to PROCESSING', async () => {
        const mockOrder = {
          orderId: 'ORD456',
          userId: 'user@example.com',
          status: 'CONFIRMED',
          statusHistory: [
            { status: 'CREATED', timestamp: new Date(), note: '' },
            { status: 'PAID', timestamp: new Date(), note: '' },
            { status: 'CONFIRMED', timestamp: new Date(), note: '' }
          ],
          trackingInfo: {},
          save: mockOrderSave
        };

        mockOrderFindOne.mockResolvedValue(mockOrder);
        mockOrderSave.mockResolvedValue(mockOrder);

        mockReq.body = {
          orderId: 'ORD456',
          status: 'PROCESSING'
        };

        await updateOrderStatus(mockReq, mockRes);

        expect(mockOrder.status).toBe('PROCESSING');
        expect(mockOrderSave).toHaveBeenCalled();
      });

      it('should update status to SHIPPED', async () => {
        const mockOrder = {
          orderId: 'ORD789',
          userId: 'user@example.com',
          status: 'PROCESSING',
          statusHistory: [],
          trackingInfo: {},
          save: mockOrderSave
        };

        mockOrderFindOne.mockResolvedValue(mockOrder);
        mockOrderSave.mockResolvedValue(mockOrder);

        mockReq.body = {
          orderId: 'ORD789',
          status: 'SHIPPED'
        };

        await updateOrderStatus(mockReq, mockRes);

        expect(mockOrder.status).toBe('SHIPPED');
      });

      it('should update status to DELIVERED', async () => {
        const mockOrder = {
          orderId: 'ORD999',
          userId: 'user@example.com',
          status: 'SHIPPED',
          statusHistory: [],
          trackingInfo: {},
          save: mockOrderSave
        };

        mockOrderFindOne.mockResolvedValue(mockOrder);
        mockOrderSave.mockResolvedValue(mockOrder);

        mockReq.body = {
          orderId: 'ORD999',
          status: 'DELIVERED'
        };

        await updateOrderStatus(mockReq, mockRes);

        expect(mockOrder.status).toBe('DELIVERED');
      });

      it('should update status to CANCELLED', async () => {
        const mockOrder = {
          orderId: 'ORD111',
          userId: 'user@example.com',
          status: 'CONFIRMED',
          statusHistory: [],
          trackingInfo: {},
          save: mockOrderSave
        };

        mockOrderFindOne.mockResolvedValue(mockOrder);
        mockOrderSave.mockResolvedValue(mockOrder);

        mockReq.body = {
          orderId: 'ORD111',
          status: 'CANCELLED',
          note: 'Cancelled by customer request'
        };

        await updateOrderStatus(mockReq, mockRes);

        expect(mockOrder.status).toBe('CANCELLED');
      });
    });

    describe('Status History Tracking', () => {
      it('should add entry to status history when status is updated', async () => {
        const mockOrder = {
          orderId: 'ORD123',
          userId: 'user@example.com',
          status: 'PAID',
          statusHistory: [],
          trackingInfo: {},
          save: mockOrderSave
        };

        mockOrderFindOne.mockResolvedValue(mockOrder);
        mockOrderSave.mockResolvedValue(mockOrder);

        mockReq.body = {
          orderId: 'ORD123',
          status: 'CONFIRMED',
          note: 'Order confirmed'
        };

        await updateOrderStatus(mockReq, mockRes);

        expect(mockOrder.statusHistory).toHaveLength(1);
        expect(mockOrder.statusHistory[0]).toMatchObject({
          status: 'CONFIRMED',
          note: 'Order confirmed'
        });
        expect(mockOrder.statusHistory[0].timestamp).toBeInstanceOf(Date);
      });

      it('should append to existing status history', async () => {
        const existingHistory = [
          { status: 'CREATED', timestamp: new Date('2026-02-01'), note: '' },
          { status: 'PAID', timestamp: new Date('2026-02-02'), note: '' }
        ];

        const mockOrder = {
          orderId: 'ORD456',
          userId: 'user@example.com',
          status: 'PAID',
          statusHistory: [...existingHistory],
          trackingInfo: {},
          save: mockOrderSave
        };

        mockOrderFindOne.mockResolvedValue(mockOrder);
        mockOrderSave.mockResolvedValue(mockOrder);

        mockReq.body = {
          orderId: 'ORD456',
          status: 'CONFIRMED'
        };

        await updateOrderStatus(mockReq, mockRes);

        expect(mockOrder.statusHistory).toHaveLength(3);
        expect(mockOrder.statusHistory[2].status).toBe('CONFIRMED');
      });

      it('should include note in status history when provided', async () => {
        const mockOrder = {
          orderId: 'ORD789',
          userId: 'user@example.com',
          status: 'CONFIRMED',
          statusHistory: [],
          trackingInfo: {},
          save: mockOrderSave
        };

        mockOrderFindOne.mockResolvedValue(mockOrder);
        mockOrderSave.mockResolvedValue(mockOrder);

        mockReq.body = {
          orderId: 'ORD789',
          status: 'PROCESSING',
          note: 'Items being prepared for shipment'
        };

        await updateOrderStatus(mockReq, mockRes);

        expect(mockOrder.statusHistory[0].note).toBe('Items being prepared for shipment');
      });

      it('should use empty string for note when not provided', async () => {
        const mockOrder = {
          orderId: 'ORD999',
          userId: 'user@example.com',
          status: 'PROCESSING',
          statusHistory: [],
          trackingInfo: {},
          save: mockOrderSave
        };

        mockOrderFindOne.mockResolvedValue(mockOrder);
        mockOrderSave.mockResolvedValue(mockOrder);

        mockReq.body = {
          orderId: 'ORD999',
          status: 'SHIPPED'
        };

        await updateOrderStatus(mockReq, mockRes);

        expect(mockOrder.statusHistory[0].note).toBe('');
      });

      it('should track multiple status changes in order', async () => {
        const mockOrder = {
          orderId: 'ORD111',
          userId: 'user@example.com',
          status: 'CREATED',
          statusHistory: [],
          trackingInfo: {},
          save: mockOrderSave
        };

        mockOrderFindOne.mockResolvedValue(mockOrder);
        mockOrderSave.mockResolvedValue(mockOrder);

        // First update
        mockReq.body = { orderId: 'ORD111', status: 'PAID' };
        await updateOrderStatus(mockReq, mockRes);

        // Second update
        mockReq.body = { orderId: 'ORD111', status: 'CONFIRMED' };
        await updateOrderStatus(mockReq, mockRes);

        // Third update
        mockReq.body = { orderId: 'ORD111', status: 'PROCESSING' };
        await updateOrderStatus(mockReq, mockRes);

        expect(mockOrder.statusHistory).toHaveLength(3);
        expect(mockOrder.statusHistory[0].status).toBe('PAID');
        expect(mockOrder.statusHistory[1].status).toBe('CONFIRMED');
        expect(mockOrder.statusHistory[2].status).toBe('PROCESSING');
      });
    });

    describe('Tracking Information Updates', () => {
      it('should update tracking carrier when provided', async () => {
        const mockOrder = {
          orderId: 'ORD123',
          userId: 'user@example.com',
          status: 'PROCESSING',
          statusHistory: [],
          trackingInfo: {},
          save: mockOrderSave
        };

        mockOrderFindOne.mockResolvedValue(mockOrder);
        mockOrderSave.mockResolvedValue(mockOrder);

        mockReq.body = {
          orderId: 'ORD123',
          status: 'SHIPPED',
          trackingInfo: {
            carrier: 'BlueDart'
          }
        };

        await updateOrderStatus(mockReq, mockRes);

        expect(mockOrder.trackingInfo.carrier).toBe('BlueDart');
      });

      it('should update tracking number when provided', async () => {
        const mockOrder = {
          orderId: 'ORD456',
          userId: 'user@example.com',
          status: 'PROCESSING',
          statusHistory: [],
          trackingInfo: {},
          save: mockOrderSave
        };

        mockOrderFindOne.mockResolvedValue(mockOrder);
        mockOrderSave.mockResolvedValue(mockOrder);

        mockReq.body = {
          orderId: 'ORD456',
          status: 'SHIPPED',
          trackingInfo: {
            trackingNumber: 'BD123456789'
          }
        };

        await updateOrderStatus(mockReq, mockRes);

        expect(mockOrder.trackingInfo.trackingNumber).toBe('BD123456789');
      });

      it('should update estimated delivery date when provided', async () => {
        const mockOrder = {
          orderId: 'ORD789',
          userId: 'user@example.com',
          status: 'PROCESSING',
          statusHistory: [],
          trackingInfo: {},
          save: mockOrderSave
        };

        mockOrderFindOne.mockResolvedValue(mockOrder);
        mockOrderSave.mockResolvedValue(mockOrder);

        const estimatedDate = new Date('2026-02-20');

        mockReq.body = {
          orderId: 'ORD789',
          status: 'SHIPPED',
          trackingInfo: {
            estimatedDelivery: estimatedDate
          }
        };

        await updateOrderStatus(mockReq, mockRes);

        expect(mockOrder.trackingInfo.estimatedDelivery).toEqual(estimatedDate);
      });

      it('should update all tracking info fields together', async () => {
        const mockOrder = {
          orderId: 'ORD999',
          userId: 'user@example.com',
          status: 'PROCESSING',
          statusHistory: [],
          trackingInfo: {},
          save: mockOrderSave
        };

        mockOrderFindOne.mockResolvedValue(mockOrder);
        mockOrderSave.mockResolvedValue(mockOrder);

        const estimatedDate = new Date('2026-02-25');

        mockReq.body = {
          orderId: 'ORD999',
          status: 'SHIPPED',
          trackingInfo: {
            carrier: 'Delhivery',
            trackingNumber: 'DLV987654321',
            estimatedDelivery: estimatedDate
          }
        };

        await updateOrderStatus(mockReq, mockRes);

        expect(mockOrder.trackingInfo.carrier).toBe('Delhivery');
        expect(mockOrder.trackingInfo.trackingNumber).toBe('DLV987654321');
        expect(mockOrder.trackingInfo.estimatedDelivery).toEqual(estimatedDate);
      });

      it('should not modify tracking info when not provided', async () => {
        const mockOrder = {
          orderId: 'ORD111',
          userId: 'user@example.com',
          status: 'CONFIRMED',
          statusHistory: [],
          trackingInfo: {
            carrier: 'Existing Carrier',
            trackingNumber: 'EXISTING123'
          },
          save: mockOrderSave
        };

        mockOrderFindOne.mockResolvedValue(mockOrder);
        mockOrderSave.mockResolvedValue(mockOrder);

        mockReq.body = {
          orderId: 'ORD111',
          status: 'PROCESSING'
        };

        await updateOrderStatus(mockReq, mockRes);

        expect(mockOrder.trackingInfo.carrier).toBe('Existing Carrier');
        expect(mockOrder.trackingInfo.trackingNumber).toBe('EXISTING123');
      });
    });

    describe('Email Notifications', () => {
      it('should send email notification after status update', async () => {
        const mockOrder = {
          orderId: 'ORD123',
          userId: 'user@example.com',
          status: 'PAID',
          statusHistory: [],
          trackingInfo: {},
          save: mockOrderSave
        };

        mockOrderFindOne.mockResolvedValue(mockOrder);
        mockOrderSave.mockResolvedValue(mockOrder);

        mockReq.body = {
          orderId: 'ORD123',
          status: 'CONFIRMED'
        };

        await updateOrderStatus(mockReq, mockRes);

        expect(mockSendOrderStatusUpdate).toHaveBeenCalledWith(
          'user@example.com',
          'ORD123',
          'CONFIRMED'
        );
      });

      it('should send email with correct parameters for SHIPPED status', async () => {
        const mockOrder = {
          orderId: 'ORD456',
          userId: 'customer@example.com',
          status: 'PROCESSING',
          statusHistory: [],
          trackingInfo: {},
          save: mockOrderSave
        };

        mockOrderFindOne.mockResolvedValue(mockOrder);
        mockOrderSave.mockResolvedValue(mockOrder);

        mockReq.body = {
          orderId: 'ORD456',
          status: 'SHIPPED'
        };

        await updateOrderStatus(mockReq, mockRes);

        expect(mockSendOrderStatusUpdate).toHaveBeenCalledWith(
          'customer@example.com',
          'ORD456',
          'SHIPPED'
        );
      });

      it('should continue even if email sending fails', async () => {
        const mockOrder = {
          orderId: 'ORD789',
          userId: 'user@example.com',
          status: 'CONFIRMED',
          statusHistory: [],
          trackingInfo: {},
          save: mockOrderSave
        };

        mockOrderFindOne.mockResolvedValue(mockOrder);
        mockOrderSave.mockResolvedValue(mockOrder);
        mockSendOrderStatusUpdate.mockRejectedValue(new Error('Email service unavailable'));

        mockReq.body = {
          orderId: 'ORD789',
          status: 'PROCESSING'
        };

        await updateOrderStatus(mockReq, mockRes);

        // Should still return success even if email fails
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockOrder.status).toBe('PROCESSING');
      });
    });

    describe('Response Format', () => {
      it('should return order details in response', async () => {
        const mockOrder = {
          orderId: 'ORD123',
          userId: 'user@example.com',
          status: 'PAID',
          statusHistory: [],
          trackingInfo: {},
          save: mockOrderSave
        };

        mockOrderFindOne.mockResolvedValue(mockOrder);
        mockOrderSave.mockResolvedValue(mockOrder);

        mockReq.body = {
          orderId: 'ORD123',
          status: 'CONFIRMED'
        };

        await updateOrderStatus(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 200,
            message: 'Order status updated successfully',
            data: expect.objectContaining({
              orderId: 'ORD123',
              status: 'CONFIRMED',
              statusHistory: expect.any(Array),
              trackingInfo: expect.any(Object)
            }),
            success: true
          })
        );
      });

      it('should include updated status history in response', async () => {
        const mockOrder = {
          orderId: 'ORD456',
          userId: 'user@example.com',
          status: 'CONFIRMED',
          statusHistory: [
            { status: 'CREATED', timestamp: new Date(), note: '' }
          ],
          trackingInfo: {},
          save: mockOrderSave
        };

        mockOrderFindOne.mockResolvedValue(mockOrder);
        mockOrderSave.mockResolvedValue(mockOrder);

        mockReq.body = {
          orderId: 'ORD456',
          status: 'PROCESSING',
          note: 'Processing started'
        };

        await updateOrderStatus(mockReq, mockRes);

        const responseData = mockRes.json.mock.calls[0][0].data;
        expect(responseData.statusHistory).toHaveLength(2);
        expect(responseData.statusHistory[1]).toMatchObject({
          status: 'PROCESSING',
          note: 'Processing started'
        });
      });

      it('should include tracking info in response', async () => {
        const mockOrder = {
          orderId: 'ORD789',
          userId: 'user@example.com',
          status: 'PROCESSING',
          statusHistory: [],
          trackingInfo: {},
          save: mockOrderSave
        };

        mockOrderFindOne.mockResolvedValue(mockOrder);
        mockOrderSave.mockResolvedValue(mockOrder);

        mockReq.body = {
          orderId: 'ORD789',
          status: 'SHIPPED',
          trackingInfo: {
            carrier: 'FedEx',
            trackingNumber: 'FX123456'
          }
        };

        await updateOrderStatus(mockReq, mockRes);

        const responseData = mockRes.json.mock.calls[0][0].data;
        expect(responseData.trackingInfo).toMatchObject({
          carrier: 'FedEx',
          trackingNumber: 'FX123456'
        });
      });
    });

    describe('Error Handling', () => {
      it('should handle database save errors', async () => {
        const mockOrder = {
          orderId: 'ORD123',
          userId: 'user@example.com',
          status: 'PAID',
          statusHistory: [],
          trackingInfo: {},
          save: jest.fn().mockRejectedValue(new Error('Database connection failed'))
        };

        mockOrderFindOne.mockResolvedValue(mockOrder);

        mockReq.body = {
          orderId: 'ORD123',
          status: 'CONFIRMED'
        };

        await updateOrderStatus(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 500,
            message: expect.stringContaining('Internal Server Error'),
            success: false
          })
        );
      });

      it('should handle database query errors', async () => {
        mockOrderFindOne.mockRejectedValue(new Error('Query timeout'));

        mockReq.body = {
          orderId: 'ORD456',
          status: 'CONFIRMED'
        };

        await updateOrderStatus(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 500,
            success: false
          })
        );
      });
    });
  });
});
