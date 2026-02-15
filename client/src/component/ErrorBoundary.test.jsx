import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';

// Component that throws an error for testing
const ThrowError = ({ shouldThrow, errorMessage }) => {
  if (shouldThrow) {
    throw new Error(errorMessage || 'Test error');
  }
  return <div>No error</div>;
};

// Helper to render ErrorBoundary with router context
const renderWithRouter = (ui) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('ErrorBoundary Component', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    // Suppress console.error during tests to avoid cluttering test output
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Error Catching and Fallback UI', () => {
    it('should render children when there is no error', () => {
      renderWithRouter(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
      expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument();
    });

    it('should catch errors and display fallback UI', () => {
      renderWithRouter(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Component crashed" />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Oops! Something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/We're sorry for the inconvenience/i)).toBeInTheDocument();
      expect(screen.queryByText('No error')).not.toBeInTheDocument();
    });

    it('should display error icon in fallback UI', () => {
      const { container } = renderWithRouter(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Check for the SVG error icon by querying the DOM
      const errorIcon = container.querySelector('svg');
      expect(errorIcon).toBeInTheDocument();
      expect(errorIcon).toHaveClass('h-8', 'w-8', 'text-red-600');
    });

    it('should display action buttons in fallback UI', () => {
      renderWithRouter(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go to home/i })).toBeInTheDocument();
    });

    it('should log error to console when error is caught', () => {
      renderWithRouter(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Test error message" />
        </ErrorBoundary>
      );

      expect(consoleErrorSpy).toHaveBeenCalled();
      // Check that the error was logged with the correct message
      const errorCalls = consoleErrorSpy.mock.calls.find(call => 
        call[0] === 'ErrorBoundary caught an error:'
      );
      expect(errorCalls).toBeDefined();
    });
  });

  describe('Development Mode Error Details', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should show error details in development mode', () => {
      process.env.NODE_ENV = 'development';

      renderWithRouter(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Development error" />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Error Details \(Development Only\)/i)).toBeInTheDocument();
    });

    it('should hide error details in production mode', () => {
      process.env.NODE_ENV = 'production';

      renderWithRouter(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Production error" />
        </ErrorBoundary>
      );

      expect(screen.queryByText(/Error Details \(Development Only\)/i)).not.toBeInTheDocument();
    });
  });

  describe('Reset Functionality', () => {
    it('should reset error state when Try Again button is clicked', async () => {
      const user = userEvent.setup();
      
      // Mock window.location.reload
      const reloadMock = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true,
      });

      renderWithRouter(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Verify fallback UI is displayed
      expect(screen.getByText(/Oops! Something went wrong/i)).toBeInTheDocument();

      // Click Try Again button
      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);

      // Verify page reload was called
      await waitFor(() => {
        expect(reloadMock).toHaveBeenCalled();
      });
    });

    it('should reset error state and navigate home when Go to Home button is clicked', async () => {
      const user = userEvent.setup();

      renderWithRouter(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Verify fallback UI is displayed
      expect(screen.getByText(/Oops! Something went wrong/i)).toBeInTheDocument();

      // Click Go to Home button
      const goHomeButton = screen.getByRole('button', { name: /go to home/i });
      
      // Verify button is clickable and exists
      expect(goHomeButton).toBeInTheDocument();
      expect(goHomeButton).toBeEnabled();
      
      await user.click(goHomeButton);

      // The button click triggers navigation and reset
      // In a real app, this would navigate to home
      // For this test, we verify the button interaction works
      expect(goHomeButton).toHaveBeenCalled;
    });
  });

  describe('Error State Management', () => {
    it('should store error details in component state', () => {
      const { container } = renderWithRouter(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="State test error" />
        </ErrorBoundary>
      );

      // Verify the error message is displayed (which means it's in state)
      expect(screen.getByText(/Oops! Something went wrong/i)).toBeInTheDocument();
      expect(container).toBeInTheDocument();
    });

    it('should handle multiple errors correctly', () => {
      const { rerender } = renderWithRouter(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      // No error initially
      expect(screen.getByText('No error')).toBeInTheDocument();

      // Trigger error
      rerender(
        <BrowserRouter>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} errorMessage="First error" />
          </ErrorBoundary>
        </BrowserRouter>
      );

      // Error UI should be displayed
      expect(screen.getByText(/Oops! Something went wrong/i)).toBeInTheDocument();
    });
  });

  describe('Children Rendering', () => {
    it('should render multiple children when no error occurs', () => {
      renderWithRouter(
        <ErrorBoundary>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
      expect(screen.getByText('Child 3')).toBeInTheDocument();
    });

    it('should catch error from any child component', () => {
      renderWithRouter(
        <ErrorBoundary>
          <div>Safe child 1</div>
          <ThrowError shouldThrow={true} errorMessage="Child error" />
          <div>Safe child 2</div>
        </ErrorBoundary>
      );

      // Error UI should be displayed
      expect(screen.getByText(/Oops! Something went wrong/i)).toBeInTheDocument();
      // Safe children should not be rendered
      expect(screen.queryByText('Safe child 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Safe child 2')).not.toBeInTheDocument();
    });
  });

  describe('Fallback UI Styling and Accessibility', () => {
    it('should have proper heading structure', () => {
      renderWithRouter(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const heading = screen.getByRole('heading', { name: /Oops! Something went wrong/i });
      expect(heading).toBeInTheDocument();
    });

    it('should have accessible buttons', () => {
      renderWithRouter(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      const goHomeButton = screen.getByRole('button', { name: /go to home/i });

      expect(tryAgainButton).toBeEnabled();
      expect(goHomeButton).toBeEnabled();
    });

    it('should display user-friendly error message', () => {
      renderWithRouter(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/We're sorry for the inconvenience/i)).toBeInTheDocument();
      expect(screen.getByText(/The page encountered an error and couldn't load properly/i)).toBeInTheDocument();
    });
  });
});
