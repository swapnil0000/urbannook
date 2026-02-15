import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import { configureStore } from '@reduxjs/toolkit';
import cartReducer from '../store/slices/cartSlice';

// Mock CheckoutPage component with order summary logic
const OrderSummary = ({ cartItems, totalAmount, appliedCoupon, discount }) => {
  const finalTotal = totalAmount - discount;

  return (
    <div data-testid="order-summary">
      <h2>Order Summary</h2>
      <span>{cartItems.length} Items</span>

      <div data-testid="cart-items">
        {cartItems.map((item) => (
          <div key={item.id} data-testid={`cart-item-${item.id}`}>
            <h3>{item.name}</h3>
            <p>Qty: {item.quantity}</p>
            <p>₹{(item.price * item.quantity).toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div data-testid="totals">
        <div data-testid="subtotal">
          <span>Subtotal</span>
          <span>₹{totalAmount.toLocaleString()}</span>
        </div>
        
        {appliedCoupon && discount > 0 && (
          <div data-testid="discount">
            <span>Discount ({appliedCoupon})</span>
            <span>-₹{discount.toLocaleString()}</span>
          </div>
        )}
        
        <div data-testid="shipping">
          <span>Shipping</span>
          <span>Free</span>
        </div>
        
        <div data-testid="total">
          <span>Total To Pay</span>
          <span>₹{finalTotal.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

describe('Order Summary with Discount', () => {
  const mockCartItems = [
    {
      id: '1',
      name: 'Product 1',
      price: 1000,
      quantity: 2,
      image: '/product1.jpg',
    },
    {
      id: '2',
      name: 'Product 2',
      price: 500,
      quantity: 1,
      image: '/product2.jpg',
    },
  ];

  describe('Order Summary Display', () => {
    it('should display subtotal correctly', () => {
      renderWithProviders(
        <OrderSummary
          cartItems={mockCartItems}
          totalAmount={2500}
          appliedCoupon={null}
          discount={0}
        />
      );

      const subtotal = screen.getByTestId('subtotal');
      expect(subtotal).toHaveTextContent('Subtotal');
      expect(subtotal).toHaveTextContent('₹2,500');
    });

    it('should display shipping as Free', () => {
      renderWithProviders(
        <OrderSummary
          cartItems={mockCartItems}
          totalAmount={2500}
          appliedCoupon={null}
          discount={0}
        />
      );

      const shipping = screen.getByTestId('shipping');
      expect(shipping).toHaveTextContent('Shipping');
      expect(shipping).toHaveTextContent('Free');
    });

    it('should display total without discount when no coupon applied', () => {
      renderWithProviders(
        <OrderSummary
          cartItems={mockCartItems}
          totalAmount={2500}
          appliedCoupon={null}
          discount={0}
        />
      );

      const total = screen.getByTestId('total');
      expect(total).toHaveTextContent('Total To Pay');
      expect(total).toHaveTextContent('₹2,500');
    });

    it('should display item count correctly', () => {
      renderWithProviders(
        <OrderSummary
          cartItems={mockCartItems}
          totalAmount={2500}
          appliedCoupon={null}
          discount={0}
        />
      );

      expect(screen.getByText('2 Items')).toBeInTheDocument();
    });

    it('should display all cart items', () => {
      renderWithProviders(
        <OrderSummary
          cartItems={mockCartItems}
          totalAmount={2500}
          appliedCoupon={null}
          discount={0}
        />
      );

      expect(screen.getByText('Product 1')).toBeInTheDocument();
      expect(screen.getByText('Product 2')).toBeInTheDocument();
      expect(screen.getByText('Qty: 2')).toBeInTheDocument();
      expect(screen.getByText('Qty: 1')).toBeInTheDocument();
    });
  });

  describe('Order Summary with Discount', () => {
    it('should display discount when coupon is applied', () => {
      renderWithProviders(
        <OrderSummary
          cartItems={mockCartItems}
          totalAmount={2500}
          appliedCoupon="SAVE20"
          discount={500}
        />
      );

      const discount = screen.getByTestId('discount');
      expect(discount).toHaveTextContent('Discount (SAVE20)');
      expect(discount).toHaveTextContent('-₹500');
    });

    it('should not display discount when no coupon is applied', () => {
      renderWithProviders(
        <OrderSummary
          cartItems={mockCartItems}
          totalAmount={2500}
          appliedCoupon={null}
          discount={0}
        />
      );

      expect(screen.queryByTestId('discount')).not.toBeInTheDocument();
    });

    it('should calculate final total correctly with discount', () => {
      renderWithProviders(
        <OrderSummary
          cartItems={mockCartItems}
          totalAmount={2500}
          appliedCoupon="SAVE20"
          discount={500}
        />
      );

      const total = screen.getByTestId('total');
      expect(total).toHaveTextContent('₹2,000');
    });

    it('should update total when discount changes', () => {
      const { rerender } = renderWithProviders(
        <OrderSummary
          cartItems={mockCartItems}
          totalAmount={2500}
          appliedCoupon="SAVE10"
          discount={250}
        />
      );

      let total = screen.getByTestId('total');
      expect(total).toHaveTextContent('₹2,250');

      // Update discount
      rerender(
        <OrderSummary
          cartItems={mockCartItems}
          totalAmount={2500}
          appliedCoupon="SAVE20"
          discount={500}
        />
      );

      total = screen.getByTestId('total');
      expect(total).toHaveTextContent('₹2,000');
    });

    it('should display correct coupon code in discount line', () => {
      renderWithProviders(
        <OrderSummary
          cartItems={mockCartItems}
          totalAmount={2500}
          appliedCoupon="FLAT100"
          discount={100}
        />
      );

      const discount = screen.getByTestId('discount');
      expect(discount).toHaveTextContent('Discount (FLAT100)');
    });

    it('should format large discount amounts with commas', () => {
      renderWithProviders(
        <OrderSummary
          cartItems={mockCartItems}
          totalAmount={10000}
          appliedCoupon="BIG"
          discount={2500}
        />
      );

      const discount = screen.getByTestId('discount');
      expect(discount).toHaveTextContent('-₹2,500');
    });

    it('should handle zero discount correctly', () => {
      renderWithProviders(
        <OrderSummary
          cartItems={mockCartItems}
          totalAmount={2500}
          appliedCoupon="INVALID"
          discount={0}
        />
      );

      // Should not display discount line when discount is 0
      expect(screen.queryByTestId('discount')).not.toBeInTheDocument();
    });
  });

  describe('Order Summary Updates', () => {
    it('should update when coupon is applied', () => {
      const { rerender } = renderWithProviders(
        <OrderSummary
          cartItems={mockCartItems}
          totalAmount={2500}
          appliedCoupon={null}
          discount={0}
        />
      );

      // Initially no discount
      expect(screen.queryByTestId('discount')).not.toBeInTheDocument();
      expect(screen.getByTestId('total')).toHaveTextContent('₹2,500');

      // Apply coupon
      rerender(
        <OrderSummary
          cartItems={mockCartItems}
          totalAmount={2500}
          appliedCoupon="SAVE20"
          discount={500}
        />
      );

      // Discount should appear
      expect(screen.getByTestId('discount')).toBeInTheDocument();
      expect(screen.getByTestId('discount')).toHaveTextContent('Discount (SAVE20)');
      expect(screen.getByTestId('total')).toHaveTextContent('₹2,000');
    });

    it('should update when coupon is removed', () => {
      const { rerender } = renderWithProviders(
        <OrderSummary
          cartItems={mockCartItems}
          totalAmount={2500}
          appliedCoupon="SAVE20"
          discount={500}
        />
      );

      // Initially with discount
      expect(screen.getByTestId('discount')).toBeInTheDocument();
      expect(screen.getByTestId('total')).toHaveTextContent('₹2,000');

      // Remove coupon
      rerender(
        <OrderSummary
          cartItems={mockCartItems}
          totalAmount={2500}
          appliedCoupon={null}
          discount={0}
        />
      );

      // Discount should disappear
      expect(screen.queryByTestId('discount')).not.toBeInTheDocument();
      expect(screen.getByTestId('total')).toHaveTextContent('₹2,500');
    });

    it('should update when cart items change', () => {
      const { rerender } = renderWithProviders(
        <OrderSummary
          cartItems={mockCartItems}
          totalAmount={2500}
          appliedCoupon="SAVE20"
          discount={500}
        />
      );

      expect(screen.getByText('2 Items')).toBeInTheDocument();

      // Add more items
      const updatedItems = [
        ...mockCartItems,
        { id: '3', name: 'Product 3', price: 300, quantity: 1, image: '/product3.jpg' },
      ];

      rerender(
        <OrderSummary
          cartItems={updatedItems}
          totalAmount={2800}
          appliedCoupon="SAVE20"
          discount={560}
        />
      );

      expect(screen.getByText('3 Items')).toBeInTheDocument();
      expect(screen.getByText('Product 3')).toBeInTheDocument();
    });
  });

  describe('Currency Formatting', () => {
    it('should format all currency values with rupee symbol', () => {
      renderWithProviders(
        <OrderSummary
          cartItems={mockCartItems}
          totalAmount={2500}
          appliedCoupon="SAVE20"
          discount={500}
        />
      );

      const subtotal = screen.getByTestId('subtotal');
      const discount = screen.getByTestId('discount');
      const total = screen.getByTestId('total');

      expect(subtotal).toHaveTextContent('₹');
      expect(discount).toHaveTextContent('₹');
      expect(total).toHaveTextContent('₹');
    });

    it('should format large amounts with commas', () => {
      const largeCartItems = [
        { id: '1', name: 'Expensive Item', price: 50000, quantity: 2, image: '/item.jpg' },
      ];

      renderWithProviders(
        <OrderSummary
          cartItems={largeCartItems}
          totalAmount={100000}
          appliedCoupon="BIG"
          discount={10000}
        />
      );

      // JavaScript toLocaleString uses US formatting (100,000) not Indian (1,00,000)
      expect(screen.getByTestId('subtotal')).toHaveTextContent('₹100,000');
      expect(screen.getByTestId('discount')).toHaveTextContent('-₹10,000');
      expect(screen.getByTestId('total')).toHaveTextContent('₹90,000');
    });

    it('should handle decimal amounts correctly', () => {
      const decimalItems = [
        { id: '1', name: 'Item', price: 99.99, quantity: 1, image: '/item.jpg' },
      ];

      renderWithProviders(
        <OrderSummary
          cartItems={decimalItems}
          totalAmount={99.99}
          appliedCoupon={null}
          discount={0}
        />
      );

      // JavaScript toLocaleString handles decimals
      expect(screen.getByTestId('total')).toHaveTextContent('₹99.99');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty cart', () => {
      renderWithProviders(
        <OrderSummary
          cartItems={[]}
          totalAmount={0}
          appliedCoupon={null}
          discount={0}
        />
      );

      expect(screen.getByText('0 Items')).toBeInTheDocument();
      expect(screen.getByTestId('total')).toHaveTextContent('₹0');
    });

    it('should handle single item cart', () => {
      const singleItem = [mockCartItems[0]];

      renderWithProviders(
        <OrderSummary
          cartItems={singleItem}
          totalAmount={2000}
          appliedCoupon={null}
          discount={0}
        />
      );

      expect(screen.getByText('1 Items')).toBeInTheDocument();
      expect(screen.getByText('Product 1')).toBeInTheDocument();
    });

    it('should handle discount equal to total amount', () => {
      renderWithProviders(
        <OrderSummary
          cartItems={mockCartItems}
          totalAmount={2500}
          appliedCoupon="FREE"
          discount={2500}
        />
      );

      expect(screen.getByTestId('total')).toHaveTextContent('₹0');
    });

    it('should handle very large discount values', () => {
      renderWithProviders(
        <OrderSummary
          cartItems={mockCartItems}
          totalAmount={100000}
          appliedCoupon="MEGA"
          discount={50000}
        />
      );

      expect(screen.getByTestId('discount')).toHaveTextContent('-₹50,000');
      expect(screen.getByTestId('total')).toHaveTextContent('₹50,000');
    });
  });
});
