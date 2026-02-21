import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/test-utils';
import CouponList from './CouponList';
import * as userApi from '../store/api/userApi';

// Mock the API hooks
vi.mock('../store/api/userApi', () => ({
  useGetAvailableCouponsQuery: vi.fn(),
  useApplyCouponMutation: vi.fn(),
}));

describe('CouponList Component', () => {
  let mockApplyCoupon;

  const mockCoupons = [
    {
      _id: '1',
      name: 'SAVE20',
      description: 'Get 20% off on your order',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      minCartValue: 1000,
      maxDiscount: 500,
      usageLimit: 100,
      expiryDate: '2026-12-31',
    },
    {
      _id: '2',
      name: 'FLAT100',
      description: 'Get flat ₹100 off',
      discountType: 'FIXED',
      discountValue: 100,
      minCartValue: 500,
      maxDiscount: 0,
      usageLimit: 0,
      expiryDate: null,
    },
  ];

  beforeEach(() => {
    mockApplyCoupon = vi.fn();

    userApi.useApplyCouponMutation.mockReturnValue([mockApplyCoupon, {}]);
  });

  describe('Rendering', () => {
    it('should render loading state', () => {
      userApi.useGetAvailableCouponsQuery.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      renderWithProviders(<CouponList />);

      // Check for the spinner element
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should render error state', () => {
      userApi.useGetAvailableCouponsQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: { message: 'Failed to load' },
      });

      renderWithProviders(<CouponList />);

      expect(screen.getByText('Failed to load coupons')).toBeInTheDocument();
    });

    it('should render empty state when no coupons available', () => {
      userApi.useGetAvailableCouponsQuery.mockReturnValue({
        data: { data: [] },
        isLoading: false,
        error: null,
      });

      renderWithProviders(<CouponList />);

      expect(screen.getByText('No coupons available at the moment')).toBeInTheDocument();
    });

    it('should render list of available coupons', () => {
      userApi.useGetAvailableCouponsQuery.mockReturnValue({
        data: { data: mockCoupons },
        isLoading: false,
        error: null,
      });

      renderWithProviders(<CouponList />);

      expect(screen.getByText('Available Coupons')).toBeInTheDocument();
      expect(screen.getByText('SAVE20')).toBeInTheDocument();
      expect(screen.getByText('FLAT100')).toBeInTheDocument();
    });

    it('should display coupon details correctly', () => {
      userApi.useGetAvailableCouponsQuery.mockReturnValue({
        data: { data: mockCoupons },
        isLoading: false,
        error: null,
      });

      renderWithProviders(<CouponList />);

      expect(screen.getByText('20% OFF')).toBeInTheDocument();
      expect(screen.getByText('₹100 OFF')).toBeInTheDocument();
      expect(screen.getByText('Get 20% off on your order')).toBeInTheDocument();
      expect(screen.getByText('Get flat ₹100 off')).toBeInTheDocument();
    });

    it('should display minimum cart value when present', () => {
      userApi.useGetAvailableCouponsQuery.mockReturnValue({
        data: { data: mockCoupons },
        isLoading: false,
        error: null,
      });

      renderWithProviders(<CouponList />);

      expect(screen.getByText(/Min\. cart value: ₹1,000/i)).toBeInTheDocument();
      expect(screen.getByText(/Min\. cart value: ₹500/i)).toBeInTheDocument();
    });
  });

  describe('Coupon Expansion', () => {
    it('should expand coupon details when clicked', async () => {
      const user = userEvent.setup();

      userApi.useGetAvailableCouponsQuery.mockReturnValue({
        data: { data: mockCoupons },
        isLoading: false,
        error: null,
      });

      renderWithProviders(<CouponList />);

      const couponCard = screen.getByText('SAVE20').closest('div').parentElement;
      await user.click(couponCard);

      await waitFor(() => {
        expect(screen.getByText('Discount Type:')).toBeInTheDocument();
        expect(screen.getByText('Discount Value:')).toBeInTheDocument();
        expect(screen.getByText('Max Discount:')).toBeInTheDocument();
        expect(screen.getByText('Min Cart Value:')).toBeInTheDocument();
        expect(screen.getByText('Usage Limit:')).toBeInTheDocument();
        expect(screen.getByText('Valid Until:')).toBeInTheDocument();
      });
    });

    it('should collapse coupon details when clicked again', async () => {
      const user = userEvent.setup();

      userApi.useGetAvailableCouponsQuery.mockReturnValue({
        data: { data: mockCoupons },
        isLoading: false,
        error: null,
      });

      renderWithProviders(<CouponList />);

      const couponCard = screen.getByText('SAVE20').closest('div').parentElement;
      
      // Expand
      await user.click(couponCard);
      await waitFor(() => {
        expect(screen.getByText('Discount Type:')).toBeInTheDocument();
      });

      // Collapse
      await user.click(couponCard);
      await waitFor(() => {
        expect(screen.queryByText('Discount Type:')).not.toBeInTheDocument();
      });
    });

    it('should display expanded details correctly for percentage coupon', async () => {
      const user = userEvent.setup();

      userApi.useGetAvailableCouponsQuery.mockReturnValue({
        data: { data: mockCoupons },
        isLoading: false,
        error: null,
      });

      renderWithProviders(<CouponList />);

      const couponCard = screen.getByText('SAVE20').closest('div').parentElement;
      await user.click(couponCard);

      await waitFor(() => {
        expect(screen.getByText('percentage')).toBeInTheDocument();
        expect(screen.getByText('20%')).toBeInTheDocument();
        expect(screen.getByText('₹500')).toBeInTheDocument();
        expect(screen.getByText('100 times')).toBeInTheDocument();
      });
    });

    it('should display expanded details correctly for fixed coupon', async () => {
      const user = userEvent.setup();

      userApi.useGetAvailableCouponsQuery.mockReturnValue({
        data: { data: mockCoupons },
        isLoading: false,
        error: null,
      });

      renderWithProviders(<CouponList />);

      const couponCard = screen.getByText('FLAT100').closest('div').parentElement;
      await user.click(couponCard);

      await waitFor(() => {
        expect(screen.getByText('fixed')).toBeInTheDocument();
        expect(screen.getByText('₹100')).toBeInTheDocument();
      });
    });
  });

  describe('Coupon Application', () => {
    it('should apply coupon when Apply button is clicked', async () => {
      const user = userEvent.setup();
      const onCouponApplied = vi.fn();

      mockApplyCoupon.mockReturnValue({
        unwrap: () =>
          Promise.resolve({
            success: true,
            data: {
              discount: 200,
              discountType: 'PERCENTAGE',
              discountValue: 20,
            },
          }),
      });

      userApi.useGetAvailableCouponsQuery.mockReturnValue({
        data: { data: mockCoupons },
        isLoading: false,
        error: null,
      });

      renderWithProviders(<CouponList onCouponApplied={onCouponApplied} />);

      const applyButtons = screen.getAllByRole('button', { name: /apply/i });
      await user.click(applyButtons[0]);

      await waitFor(() => {
        expect(mockApplyCoupon).toHaveBeenCalledWith('SAVE20');
        expect(onCouponApplied).toHaveBeenCalledWith({
          code: 'SAVE20',
          discount: 200,
          discountType: 'PERCENTAGE',
          discountValue: 20,
        });
      });
    });

    it('should not expand coupon when Apply button is clicked', async () => {
      const user = userEvent.setup();

      mockApplyCoupon.mockResolvedValue({
        unwrap: () =>
          Promise.resolve({
            success: true,
            data: { discount: 200 },
          }),
      });

      userApi.useGetAvailableCouponsQuery.mockReturnValue({
        data: { data: mockCoupons },
        isLoading: false,
        error: null,
      });

      renderWithProviders(<CouponList />);

      const applyButtons = screen.getAllByRole('button', { name: /apply/i });
      await user.click(applyButtons[0]);

      // Should not show expanded details
      expect(screen.queryByText('Discount Type:')).not.toBeInTheDocument();
    });

    it('should show loading state on Apply button when applying', async () => {
      const user = userEvent.setup();

      mockApplyCoupon.mockImplementation(() => {
        return {
          unwrap: () => new Promise(() => {}), // Never resolves
        };
      });

      userApi.useGetAvailableCouponsQuery.mockReturnValue({
        data: { data: mockCoupons },
        isLoading: false,
        error: null,
      });

      renderWithProviders(<CouponList />);

      const applyButtons = screen.getAllByRole('button', { name: /apply/i });
      await user.click(applyButtons[0]);

      await waitFor(() => {
        expect(applyButtons[0]).toBeDisabled();
      });
    });

    it('should handle coupon application failure gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockApplyCoupon.mockRejectedValue({
        data: { message: 'Coupon expired' },
      });

      userApi.useGetAvailableCouponsQuery.mockReturnValue({
        data: { data: mockCoupons },
        isLoading: false,
        error: null,
      });

      renderWithProviders(<CouponList />);

      const applyButtons = screen.getAllByRole('button', { name: /apply/i });
      await user.click(applyButtons[0]);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to apply coupon:',
          expect.any(Object)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Display Formatting', () => {
    it('should format currency values with commas', () => {
      const largeCoupon = {
        _id: '3',
        name: 'BIG',
        discountType: 'FIXED',
        discountValue: 5000,
        minCartValue: 10000,
        maxDiscount: 0,
      };

      userApi.useGetAvailableCouponsQuery.mockReturnValue({
        data: { data: [largeCoupon] },
        isLoading: false,
        error: null,
      });

      renderWithProviders(<CouponList />);

      expect(screen.getByText(/Min\. cart value: ₹10,000/i)).toBeInTheDocument();
    });

    it('should format expiry date correctly', async () => {
      const user = userEvent.setup();

      userApi.useGetAvailableCouponsQuery.mockReturnValue({
        data: { data: mockCoupons },
        isLoading: false,
        error: null,
      });

      renderWithProviders(<CouponList />);

      const couponCard = screen.getByText('SAVE20').closest('div').parentElement;
      await user.click(couponCard);

      await waitFor(() => {
        expect(screen.getByText(/12\/31\/2026/)).toBeInTheDocument();
      });
    });

    it('should not display max discount for fixed coupons', async () => {
      const user = userEvent.setup();

      userApi.useGetAvailableCouponsQuery.mockReturnValue({
        data: { data: mockCoupons },
        isLoading: false,
        error: null,
      });

      renderWithProviders(<CouponList />);

      const couponCard = screen.getByText('FLAT100').closest('div').parentElement;
      await user.click(couponCard);

      await waitFor(() => {
        expect(screen.queryByText('Max Discount:')).not.toBeInTheDocument();
      });
    });
  });
});
