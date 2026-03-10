import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import fc from 'fast-check';
import CheckoutPage from '../pages/CheckoutPage';
import cartReducer from '../store/slices/cartSlice';
import authReducer from '../store/slices/authSlice';
import uiReducer from '../store/slices/uiSlice';
import { apiSlice } from '../store/api/apiSlice';

// Mock the lazy-loaded components
vi.mock('../component/CouponList', () => ({
  default: () => <div>Coupon List</div>,
}));

vi.mock('../component/MapModal', () => ({
  default: () => <div>Map Modal</div>,
}));

/**
 * Feature: product-color-selection
 * Property 9: Checkout UI Color Display
 * 
 * Validates: Requirements 4.1, 4.2
 * 
 * For any checkout item, the checkout UI SHALL display the selectedColor if present,
 * and SHALL display the item without color information if selectedColor is absent.
 */
describe('Feature: product-color-selection, Property 9: Checkout UI Color Display', () => {
  const createMockStore = (cartItems) => {
    return configureStore({
      reducer: {
        cart: cartReducer,
        auth: authReducer,
        ui: uiReducer,
        [apiSlice.reducerPath]: apiSlice.reducer,
      },
      preloadedState: {
        cart: {
          items: cartItems,
        },
        auth: {
          isAuthenticated: true,
          user: { userId: 'test-user' },
        },
        ui: {
          notifications: [],
        },
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(apiSlice.middleware),
    });
  };

  const renderCheckoutPage = (cartItems) => {
    // Mock localStorage
    Storage.prototype.getItem = vi.fn((key) => {
      if (key === 'authToken') return 'mock-token';
      if (key === 'user') return JSON.stringify({ userId: 'test-user' });
      return null;
    });

    const store = createMockStore(cartItems);

    return render(
      <Provider store={store}>
        <BrowserRouter>
          <CheckoutPage />
        </BrowserRouter>
      </Provider>
    );
  };

  // Arbitraries for generating test data
  const colorArbitrary = fc.string({ minLength: 3, maxLength: 20 }).filter(
    (s) => s.trim().length > 0
  );

  const cartItemWithColorArbitrary = fc.record({
    id: fc.string({ minLength: 5, maxLength: 15 }),
    mongoId: fc.string({ minLength: 5, maxLength: 15 }),
    name: fc.string({ minLength: 5, maxLength: 50 }),
    price: fc.integer({ min: 100, max: 10000 }),
    quantity: fc.integer({ min: 1, max: 5 }),
    image: fc.constant('/test-image.jpg'),
    selectedColor: colorArbitrary,
  });

  const cartItemWithoutColorArbitrary = fc.record({
    id: fc.string({ minLength: 5, maxLength: 15 }),
    mongoId: fc.string({ minLength: 5, maxLength: 15 }),
    name: fc.string({ minLength: 5, maxLength: 50 }),
    price: fc.integer({ min: 100, max: 10000 }),
    quantity: fc.integer({ min: 1, max: 5 }),
    image: fc.constant('/test-image.jpg'),
    selectedColor: fc.constant(null),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display selectedColor when present in cart items', () => {
    fc.assert(
      fc.property(
        fc.array(cartItemWithColorArbitrary, { minLength: 1, maxLength: 5 }),
        (cartItems) => {
          const { container } = renderCheckoutPage(cartItems);

          // Verify each item with color displays the color
          cartItems.forEach((item) => {
            // Check if the color text appears in the document
            const colorElements = container.querySelectorAll('p');
            const hasColorDisplay = Array.from(colorElements).some((el) =>
              el.textContent.includes(`Color: ${item.selectedColor}`)
            );

            expect(hasColorDisplay).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not display color information when selectedColor is absent', () => {
    fc.assert(
      fc.property(
        fc.array(cartItemWithoutColorArbitrary, { minLength: 1, maxLength: 5 }),
        (cartItems) => {
          const { container } = renderCheckoutPage(cartItems);

          // Verify that "Color:" text does not appear for items without selectedColor
          const colorElements = container.querySelectorAll('p');
          const hasColorDisplay = Array.from(colorElements).some((el) =>
            el.textContent.includes('Color:')
          );

          expect(hasColorDisplay).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle mixed cart items (with and without colors) correctly', () => {
    fc.assert(
      fc.property(
        fc.array(cartItemWithColorArbitrary, { minLength: 1, maxLength: 3 }),
        fc.array(cartItemWithoutColorArbitrary, { minLength: 1, maxLength: 3 }),
        (itemsWithColor, itemsWithoutColor) => {
          const mixedCartItems = [...itemsWithColor, ...itemsWithoutColor];
          const { container } = renderCheckoutPage(mixedCartItems);

          // Verify items with color display the color
          itemsWithColor.forEach((item) => {
            const colorElements = container.querySelectorAll('p');
            const hasColorDisplay = Array.from(colorElements).some((el) =>
              el.textContent.includes(`Color: ${item.selectedColor}`)
            );
            expect(hasColorDisplay).toBe(true);
          });

          // Count how many times "Color:" appears - should match items with color
          const colorElements = container.querySelectorAll('p');
          const colorDisplayCount = Array.from(colorElements).filter((el) =>
            el.textContent.includes('Color:')
          ).length;

          expect(colorDisplayCount).toBe(itemsWithColor.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should render cart items without errors regardless of color presence', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(cartItemWithColorArbitrary, cartItemWithoutColorArbitrary),
          { minLength: 1, maxLength: 5 }
        ),
        (cartItems) => {
          // Should not throw any errors during rendering
          expect(() => renderCheckoutPage(cartItems)).not.toThrow();

          const { container } = renderCheckoutPage(cartItems);

          // Verify all items are rendered (check for product names)
          cartItems.forEach((item) => {
            const itemElements = container.querySelectorAll('h3');
            const hasItemName = Array.from(itemElements).some((el) =>
              el.textContent.includes(item.name)
            );
            expect(hasItemName).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve color display format consistency', () => {
    fc.assert(
      fc.property(cartItemWithColorArbitrary, (item) => {
        const { container } = renderCheckoutPage([item]);

        // Verify the color is displayed in the expected format: "Color: {colorName}"
        const colorElements = container.querySelectorAll('p');
        const colorElement = Array.from(colorElements).find((el) =>
          el.textContent.includes('Color:')
        );

        if (colorElement) {
          // Check that the format matches "Color: {colorName}"
          const colorText = colorElement.textContent;
          expect(colorText).toMatch(/Color:\s*.+/);
          expect(colorText).toContain(item.selectedColor);
        }
      }),
      { numRuns: 100 }
    );
  });
});
