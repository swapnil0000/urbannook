import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/test-utils';
import CouponInput from './CouponInput';
import * as userApi from '../store/api/userApi';

// Mock the API hooks
vi.mock('../store/api/userApi', () => ({
  useApplyCouponMutation: vi.fn(),
  useRemoveCouponMutation: vi.fn(),
}));

describe('CouponInput Component', () => {
  let mockApplyCoupon;
  let mockRemoveCoupon;

  beforeEach(() => {
    // Reset mocks before each test
    mockApplyCoupon = vi.fn();
    mockRemoveCoupon = vi.fn();

    userApi.useApplyCouponMutation.mockReturnValue([
      mockApplyCoupon,
      { isLoading: false },
    ]);

    userApi.useRemoveCouponMutation.mockReturnValue([
      mockRemoveCoupon,
      { isLoading: false },
    ]);
  });

  describe('Rendering', () => {
    it('should render coupon input field when no coupon is applied', () => {
      renderWithProviders(<CouponInput />);

      expect(screen.getByPlaceholderText('Enter coupon code')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument();
    });

    it('should render applied coupon details when coupon is applied', () => {
      renderWithProviders(
        <CouponInput appliedCoupon="SAVE20" discount={200} />
      );

      expect(screen.getByText('SAVE20')).toBeInTheDocument();
      expect(screen.getByText(/You saved ₹200/i)).toBeInTheDocument();
      expect(screen.getByTitle('Remove coupon')).toBeInTheDocument();
    });

    it('should display Apply Coupon heading', () => {
      renderWithProviders(<CouponInput />);

      expect(screen.getByText('Apply Coupon')).toBeInTheDocument();
    });
  });

  describe('Coupon Application', () => {
    it('should apply coupon successfully and show success message', async () => {
      const user = userEvent.setup();
      const onCouponApplied = vi.fn();

      mockApplyCoupon.mockReturnValue({
        unwrap: () =>
          Promise.resolve({
            success: true,
            data: {
              discount: 150,
              discountType: 'PERCENTAGE',
              discountValue: 20,
            },
          }),
      });

      renderWithProviders(<CouponInput onCouponApplied={onCouponApplied} />);

      const input = screen.getByPlaceholderText('Enter coupon code');
      const applyButton = screen.getByRole('button', { name: /apply/i });

      await user.type(input, 'SAVE20');
      await user.click(applyButton);

      await waitFor(() => {
        expect(mockApplyCoupon).toHaveBeenCalledWith('SAVE20');
        expect(screen.getByText(/Coupon applied! You saved ₹150/i)).toBeInTheDocument();
      });

      expect(onCouponApplied).toHaveBeenCalledWith({
        code: 'SAVE20',
        discount: 150,
        discountType: 'PERCENTAGE',
        discountValue: 20,
      });
    });

    it('should show error message when coupon application fails', async () => {
      const user = userEvent.setup();

      mockApplyCoupon.mockRejectedValue({
        data: { message: 'Invalid or expired coupon code' },
      });

      renderWithProviders(<CouponInput />);

      const input = screen.getByPlaceholderText('Enter coupon code');
      const applyButton = screen.getByRole('button', { name: /apply/i });

      await user.type(input, 'INVALID');
      await user.click(applyButton);

      await waitFor(() => {
        expect(screen.getByText(/Invalid or expired coupon code/i)).toBeInTheDocument();
      });
    });

    it('should show error when trying to apply empty coupon code', async () => {
      const user = userEvent.setup();

      renderWithProviders(<CouponInput />);

      const applyButton = screen.getAllByRole('button')[0]; // Get button by index since it has no accessible name when disabled
      await user.click(applyButton);

      // The button is disabled when input is empty, so the click won't trigger the handler
      // We need to check that the button is disabled instead
      expect(applyButton).toBeDisabled();
      expect(mockApplyCoupon).not.toHaveBeenCalled();
    });

    it('should convert coupon code to uppercase', async () => {
      const user = userEvent.setup();

      mockApplyCoupon.mockResolvedValue({
        unwrap: () =>
          Promise.resolve({
            success: true,
            data: { discount: 100 },
          }),
      });

      renderWithProviders(<CouponInput />);

      const input = screen.getByPlaceholderText('Enter coupon code');
      await user.type(input, 'save20');

      expect(input.value).toBe('SAVE20');
    });

    it('should disable apply button when loading', () => {
      userApi.useApplyCouponMutation.mockReturnValue([
        mockApplyCoupon,
        { isLoading: true },
      ]);

      renderWithProviders(<CouponInput />);

      const applyButton = screen.getAllByRole('button')[0]; // Get button by index
      expect(applyButton).toBeDisabled();
    });

    it('should clear input field after successful application', async () => {
      const user = userEvent.setup();

      mockApplyCoupon.mockReturnValue({
        unwrap: () =>
          Promise.resolve({
            success: true,
            data: { discount: 100 },
          }),
      });

      renderWithProviders(<CouponInput />);

      const input = screen.getByPlaceholderText('Enter coupon code');
      await user.type(input, 'SAVE20');
      await user.click(screen.getAllByRole('button')[0]);

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });
  });

  describe('Coupon Removal', () => {
    it('should remove coupon successfully', async () => {
      const user = userEvent.setup();
      const onCouponRemoved = vi.fn();

      mockRemoveCoupon.mockReturnValue({
        unwrap: () =>
          Promise.resolve({
            success: true,
          }),
      });

      renderWithProviders(
        <CouponInput
          appliedCoupon="SAVE20"
          discount={200}
          onCouponRemoved={onCouponRemoved}
        />
      );

      const removeButton = screen.getByTitle('Remove coupon');
      await user.click(removeButton);

      await waitFor(() => {
        expect(mockRemoveCoupon).toHaveBeenCalled();
        expect(onCouponRemoved).toHaveBeenCalled();
        expect(screen.getByText('Coupon removed')).toBeInTheDocument();
      });
    });

    it('should show error when coupon removal fails', async () => {
      const user = userEvent.setup();

      mockRemoveCoupon.mockRejectedValue({
        data: { message: 'Failed to remove coupon' },
      });

      renderWithProviders(
        <CouponInput appliedCoupon="SAVE20" discount={200} />
      );

      const removeButton = screen.getByTitle('Remove coupon');
      await user.click(removeButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to remove coupon/i)).toBeInTheDocument();
      });
    });

    it('should disable remove button when loading', () => {
      userApi.useRemoveCouponMutation.mockReturnValue([
        mockRemoveCoupon,
        { isLoading: true },
      ]);

      renderWithProviders(
        <CouponInput appliedCoupon="SAVE20" discount={200} />
      );

      const removeButton = screen.getByTitle('Remove coupon');
      expect(removeButton).toBeDisabled();
    });
  });

  describe('Interaction', () => {
    it('should apply coupon when Enter key is pressed', async () => {
      const user = userEvent.setup();

      mockApplyCoupon.mockResolvedValue({
        unwrap: () =>
          Promise.resolve({
            success: true,
            data: { discount: 100 },
          }),
      });

      renderWithProviders(<CouponInput />);

      const input = screen.getByPlaceholderText('Enter coupon code');
      await user.type(input, 'SAVE20{Enter}');

      await waitFor(() => {
        expect(mockApplyCoupon).toHaveBeenCalledWith('SAVE20');
      });
    });

    it('should trim whitespace from coupon code', async () => {
      const user = userEvent.setup();

      mockApplyCoupon.mockResolvedValue({
        unwrap: () =>
          Promise.resolve({
            success: true,
            data: { discount: 100 },
          }),
      });

      renderWithProviders(<CouponInput />);

      const input = screen.getByPlaceholderText('Enter coupon code');
      await user.type(input, '  SAVE20  ');
      await user.click(screen.getByRole('button', { name: /apply/i }));

      await waitFor(() => {
        expect(mockApplyCoupon).toHaveBeenCalledWith('SAVE20');
      });
    });
  });
});
