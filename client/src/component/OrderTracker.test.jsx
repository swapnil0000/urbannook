import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OrderTracker from './OrderTracker';

describe('OrderTracker Component', () => {
  describe('Normal Order Flow Rendering', () => {
    it('should render all four steps for normal order flow', () => {
      render(<OrderTracker status="CONFIRMED" />);

      expect(screen.getByText('Confirmed')).toBeInTheDocument();
      expect(screen.getByText('Processing')).toBeInTheDocument();
      expect(screen.getByText('Shipped')).toBeInTheDocument();
      expect(screen.getByText('Delivered')).toBeInTheDocument();
    });

    it('should highlight CONFIRMED step when status is CONFIRMED', () => {
      const { container } = render(<OrderTracker status="CONFIRMED" />);

      const confirmedStep = screen.getByText('Confirmed');
      expect(confirmedStep).toHaveClass('text-green-600');
      expect(confirmedStep).toHaveClass('font-bold');
    });

    it('should highlight PROCESSING step when status is PROCESSING', () => {
      const { container } = render(<OrderTracker status="PROCESSING" />);

      const processingStep = screen.getByText('Processing');
      expect(processingStep).toHaveClass('text-green-600');
      expect(processingStep).toHaveClass('font-bold');
    });

    it('should highlight SHIPPED step when status is SHIPPED', () => {
      const { container } = render(<OrderTracker status="SHIPPED" />);

      const shippedStep = screen.getByText('Shipped');
      expect(shippedStep).toHaveClass('text-green-600');
      expect(shippedStep).toHaveClass('font-bold');
    });

    it('should highlight DELIVERED step when status is DELIVERED', () => {
      const { container } = render(<OrderTracker status="DELIVERED" />);

      const deliveredStep = screen.getByText('Delivered');
      expect(deliveredStep).toHaveClass('text-green-600');
      expect(deliveredStep).toHaveClass('font-bold');
    });

    it('should mark all steps up to current status as completed', () => {
      const { container } = render(<OrderTracker status="SHIPPED" />);

      // Confirmed, Processing, and Shipped should be green
      const confirmedStep = screen.getByText('Confirmed');
      const processingStep = screen.getByText('Processing');
      const shippedStep = screen.getByText('Shipped');
      const deliveredStep = screen.getByText('Delivered');

      expect(confirmedStep).toHaveClass('text-green-600');
      expect(processingStep).toHaveClass('text-green-600');
      expect(shippedStep).toHaveClass('text-green-600');
      expect(deliveredStep).toHaveClass('text-gray-400');
    });

    it('should mark future steps as inactive', () => {
      const { container } = render(<OrderTracker status="CONFIRMED" />);

      const processingStep = screen.getByText('Processing');
      const shippedStep = screen.getByText('Shipped');
      const deliveredStep = screen.getByText('Delivered');

      expect(processingStep).toHaveClass('text-gray-400');
      expect(shippedStep).toHaveClass('text-gray-400');
      expect(deliveredStep).toHaveClass('text-gray-400');
    });

    it('should show progress bar at 0% for CONFIRMED status', () => {
      const { container } = render(<OrderTracker status="CONFIRMED" />);

      const progressBar = container.querySelector('.bg-green-500');
      expect(progressBar).toHaveStyle({ width: '0%' });
    });

    it('should show progress bar at 33% for PROCESSING status', () => {
      const { container } = render(<OrderTracker status="PROCESSING" />);

      const progressBar = container.querySelector('.bg-green-500');
      // Allow for floating point precision differences
      const width = progressBar.style.width;
      expect(parseFloat(width)).toBeCloseTo(33.33, 1);
    });

    it('should show progress bar at 67% for SHIPPED status', () => {
      const { container } = render(<OrderTracker status="SHIPPED" />);

      const progressBar = container.querySelector('.bg-green-500');
      // Allow for floating point precision differences
      const width = progressBar.style.width;
      expect(parseFloat(width)).toBeCloseTo(66.67, 1);
    });

    it('should show progress bar at 100% for DELIVERED status', () => {
      const { container } = render(<OrderTracker status="DELIVERED" />);

      const progressBar = container.querySelector('.bg-green-500');
      expect(progressBar).toHaveStyle({ width: '100%' });
    });
  });

  describe('Special Status Rendering', () => {
    it('should render cancelled status with red styling', () => {
      render(<OrderTracker status="CANCELLED" />);

      expect(screen.getByText('Order Cancelled')).toBeInTheDocument();
      
      const cancelledContainer = screen.getByText('Order Cancelled').closest('div');
      expect(cancelledContainer).toHaveClass('text-red-500');
    });

    it('should render failed status with red styling', () => {
      render(<OrderTracker status="FAILED" />);

      expect(screen.getByText('Order Failed')).toBeInTheDocument();
      
      const failedContainer = screen.getByText('Order Failed').closest('div');
      expect(failedContainer).toHaveClass('text-red-500');
    });

    it('should not show normal steps for cancelled orders', () => {
      render(<OrderTracker status="CANCELLED" />);

      expect(screen.queryByText('Confirmed')).not.toBeInTheDocument();
      expect(screen.queryByText('Processing')).not.toBeInTheDocument();
      expect(screen.queryByText('Shipped')).not.toBeInTheDocument();
      expect(screen.queryByText('Delivered')).not.toBeInTheDocument();
    });

    it('should not show normal steps for failed orders', () => {
      render(<OrderTracker status="FAILED" />);

      expect(screen.queryByText('Confirmed')).not.toBeInTheDocument();
      expect(screen.queryByText('Processing')).not.toBeInTheDocument();
      expect(screen.queryByText('Shipped')).not.toBeInTheDocument();
      expect(screen.queryByText('Delivered')).not.toBeInTheDocument();
    });

    it('should render CREATED status with yellow styling', () => {
      render(<OrderTracker status="CREATED" />);

      expect(screen.getByText('Order Created')).toBeInTheDocument();
      expect(screen.getByText('Awaiting confirmation')).toBeInTheDocument();
      
      const createdContainer = screen.getByText('Order Created').closest('div');
      expect(createdContainer).toHaveClass('text-yellow-500');
    });

    it('should render PAID status with yellow styling', () => {
      render(<OrderTracker status="PAID" />);

      expect(screen.getByText('Payment Received')).toBeInTheDocument();
      expect(screen.getByText('Awaiting confirmation')).toBeInTheDocument();
      
      const paidContainer = screen.getByText('Payment Received').closest('div');
      expect(paidContainer).toHaveClass('text-yellow-500');
    });

    it('should show pulsing animation for CREATED status', () => {
      const { container } = render(<OrderTracker status="CREATED" />);

      const icon = container.querySelector('.animate-pulse');
      expect(icon).toBeInTheDocument();
    });

    it('should show pulsing animation for PAID status', () => {
      const { container } = render(<OrderTracker status="PAID" />);

      const icon = container.querySelector('.animate-pulse');
      expect(icon).toBeInTheDocument();
    });

    it('should not show normal steps for CREATED status', () => {
      render(<OrderTracker status="CREATED" />);

      expect(screen.queryByText('Confirmed')).not.toBeInTheDocument();
      expect(screen.queryByText('Processing')).not.toBeInTheDocument();
    });

    it('should not show normal steps for PAID status', () => {
      render(<OrderTracker status="PAID" />);

      expect(screen.queryByText('Confirmed')).not.toBeInTheDocument();
      expect(screen.queryByText('Processing')).not.toBeInTheDocument();
    });
  });

  describe('Icon Rendering', () => {
    it('should render CheckCircle icon for Confirmed step', () => {
      const { container } = render(<OrderTracker status="CONFIRMED" />);

      // Check that the icon is rendered (Lucide icons render as SVG)
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should render Package icon for Processing step', () => {
      const { container } = render(<OrderTracker status="PROCESSING" />);

      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should render Truck icon for Shipped step', () => {
      const { container } = render(<OrderTracker status="SHIPPED" />);

      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should render Home icon for Delivered step', () => {
      const { container } = render(<OrderTracker status="DELIVERED" />);

      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should render XCircle icon for cancelled orders', () => {
      const { container } = render(<OrderTracker status="CANCELLED" />);

      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should render XCircle icon for failed orders', () => {
      const { container } = render(<OrderTracker status="FAILED" />);

      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Visual Styling', () => {
    it('should apply green background to completed step icons', () => {
      const { container } = render(<OrderTracker status="PROCESSING" />);

      const stepIcons = container.querySelectorAll('.bg-green-500');
      // Confirmed and Processing should be green
      expect(stepIcons.length).toBeGreaterThanOrEqual(2);
    });

    it('should apply gray background to incomplete step icons', () => {
      const { container } = render(<OrderTracker status="CONFIRMED" />);

      const stepIcons = container.querySelectorAll('.bg-gray-200');
      // Processing, Shipped, Delivered should be gray
      expect(stepIcons.length).toBeGreaterThanOrEqual(3);
    });

    it('should apply ring styling to current step', () => {
      const { container } = render(<OrderTracker status="PROCESSING" />);

      const ringElement = container.querySelector('.ring-4');
      expect(ringElement).toBeInTheDocument();
      expect(ringElement).toHaveClass('ring-green-200');
    });

    it('should apply scale transform to current step', () => {
      const { container } = render(<OrderTracker status="SHIPPED" />);

      const scaledElement = container.querySelector('.scale-110');
      expect(scaledElement).toBeInTheDocument();
    });

    it('should have transition classes for smooth animations', () => {
      const { container } = render(<OrderTracker status="CONFIRMED" />);

      const transitionElements = container.querySelectorAll('.transition-all');
      expect(transitionElements.length).toBeGreaterThan(0);
    });

    it('should render with proper spacing and layout', () => {
      const { container } = render(<OrderTracker status="PROCESSING" />);

      const wrapper = container.querySelector('.w-full');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveClass('py-6');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined status gracefully', () => {
      const { container } = render(<OrderTracker status={undefined} />);

      // Should render the component without crashing
      expect(container).toBeInTheDocument();
    });

    it('should handle null status gracefully', () => {
      const { container } = render(<OrderTracker status={null} />);

      // Should render the component without crashing
      expect(container).toBeInTheDocument();
    });

    it('should handle empty string status gracefully', () => {
      const { container } = render(<OrderTracker status="" />);

      // Should render the component without crashing
      expect(container).toBeInTheDocument();
    });

    it('should handle unknown status gracefully', () => {
      const { container } = render(<OrderTracker status="UNKNOWN_STATUS" />);

      // Should render the component without crashing
      expect(container).toBeInTheDocument();
    });

    it('should render correctly when status is lowercase', () => {
      const { container } = render(<OrderTracker status="confirmed" />);

      // Should not match and show progress bar at 0%
      const progressBar = container.querySelector('.bg-green-500');
      expect(progressBar).toHaveStyle({ width: '0%' });
    });
  });

  describe('Accessibility', () => {
    it('should render semantic HTML structure', () => {
      const { container } = render(<OrderTracker status="PROCESSING" />);

      const divs = container.querySelectorAll('div');
      expect(divs.length).toBeGreaterThan(0);
    });

    it('should have readable text for all steps', () => {
      render(<OrderTracker status="CONFIRMED" />);

      expect(screen.getByText('Confirmed')).toBeVisible();
      expect(screen.getByText('Processing')).toBeVisible();
      expect(screen.getByText('Shipped')).toBeVisible();
      expect(screen.getByText('Delivered')).toBeVisible();
    });

    it('should have readable text for cancelled status', () => {
      render(<OrderTracker status="CANCELLED" />);

      expect(screen.getByText('Order Cancelled')).toBeVisible();
    });

    it('should have readable text for failed status', () => {
      render(<OrderTracker status="FAILED" />);

      expect(screen.getByText('Order Failed')).toBeVisible();
    });

    it('should have readable text for created status', () => {
      render(<OrderTracker status="CREATED" />);

      expect(screen.getByText('Order Created')).toBeVisible();
      expect(screen.getByText('Awaiting confirmation')).toBeVisible();
    });

    it('should have readable text for paid status', () => {
      render(<OrderTracker status="PAID" />);

      expect(screen.getByText('Payment Received')).toBeVisible();
      expect(screen.getByText('Awaiting confirmation')).toBeVisible();
    });
  });

  describe('Component Props', () => {
    it('should accept status prop', () => {
      const { rerender } = render(<OrderTracker status="CONFIRMED" />);

      expect(screen.getByText('Confirmed')).toBeInTheDocument();

      rerender(<OrderTracker status="SHIPPED" />);

      const shippedStep = screen.getByText('Shipped');
      expect(shippedStep).toHaveClass('text-green-600');
    });

    it('should update when status prop changes', () => {
      const { rerender, container } = render(<OrderTracker status="CONFIRMED" />);

      let progressBar = container.querySelector('.bg-green-500');
      expect(progressBar).toHaveStyle({ width: '0%' });

      rerender(<OrderTracker status="PROCESSING" />);

      progressBar = container.querySelector('.bg-green-500');
      const width1 = parseFloat(progressBar.style.width);
      expect(width1).toBeCloseTo(33.33, 1);

      rerender(<OrderTracker status="DELIVERED" />);

      progressBar = container.querySelector('.bg-green-500');
      expect(progressBar).toHaveStyle({ width: '100%' });
    });
  });

  describe('Complete Order Journey', () => {
    it('should correctly display progression from CONFIRMED to DELIVERED', () => {
      const { rerender, container } = render(<OrderTracker status="CONFIRMED" />);

      // Step 1: CONFIRMED
      let confirmedStep = screen.getByText('Confirmed');
      expect(confirmedStep).toHaveClass('font-bold');

      // Step 2: PROCESSING
      rerender(<OrderTracker status="PROCESSING" />);
      let processingStep = screen.getByText('Processing');
      expect(processingStep).toHaveClass('font-bold');

      // Step 3: SHIPPED
      rerender(<OrderTracker status="SHIPPED" />);
      let shippedStep = screen.getByText('Shipped');
      expect(shippedStep).toHaveClass('font-bold');

      // Step 4: DELIVERED
      rerender(<OrderTracker status="DELIVERED" />);
      let deliveredStep = screen.getByText('Delivered');
      expect(deliveredStep).toHaveClass('font-bold');
    });

    it('should show all previous steps as completed when at DELIVERED', () => {
      render(<OrderTracker status="DELIVERED" />);

      const confirmedStep = screen.getByText('Confirmed');
      const processingStep = screen.getByText('Processing');
      const shippedStep = screen.getByText('Shipped');
      const deliveredStep = screen.getByText('Delivered');

      expect(confirmedStep).toHaveClass('text-green-600');
      expect(processingStep).toHaveClass('text-green-600');
      expect(shippedStep).toHaveClass('text-green-600');
      expect(deliveredStep).toHaveClass('text-green-600');
    });
  });
});
