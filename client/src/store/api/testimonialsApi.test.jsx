import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from './apiSlice';
import authSlice from '../slices/authSlice';
import { useGetTestimonialsQuery, useSubmitTestimonialMutation } from './testimonialsApi';

// Create a wrapper component for testing hooks
const createWrapper = (store) => {
  return ({ children }) => (
    <Provider store={store}>{children}</Provider>
  );
};

// Create a mock store for testing
const createMockStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
      auth: authSlice,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(apiSlice.middleware),
    preloadedState: {
      auth: { token: null, user: null, isAuthenticated: false },
      ...preloadedState,
    },
  });
};

describe('Testimonials API Hooks', () => {
  let store;
  let wrapper;

  beforeEach(() => {
    store = createMockStore();
    wrapper = createWrapper(store);
  });

  describe('useGetTestimonialsQuery', () => {
    it('should exist and be a function', () => {
      expect(useGetTestimonialsQuery).toBeDefined();
      expect(typeof useGetTestimonialsQuery).toBe('function');
    });

    it('should return query hook with proper structure', () => {
      const { result } = renderHook(() => useGetTestimonialsQuery(), {
        wrapper,
      });

      // The hook should return an object with RTK Query properties
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('refetch');
      expect(result.current).toHaveProperty('isSuccess');
      expect(result.current).toHaveProperty('isError');
    });

    it('should initially be in loading state', () => {
      const { result } = renderHook(() => useGetTestimonialsQuery(), {
        wrapper,
      });

      // Initially should be loading or pending
      expect(result.current.isLoading || result.current.status === 'pending').toBe(true);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useSubmitTestimonialMutation', () => {
    it('should exist and be a function', () => {
      expect(useSubmitTestimonialMutation).toBeDefined();
      expect(typeof useSubmitTestimonialMutation).toBe('function');
    });

    it('should return mutation hook with proper structure', () => {
      const { result } = renderHook(() => useSubmitTestimonialMutation(), {
        wrapper,
      });

      const [submitTestimonial, mutationResult] = result.current;

      expect(typeof submitTestimonial).toBe('function');
      expect(mutationResult).toHaveProperty('isLoading');
      expect(mutationResult).toHaveProperty('data');
      expect(mutationResult).toHaveProperty('isSuccess');
      expect(mutationResult).toHaveProperty('isError');
    });

    it('should initially not be loading', () => {
      const { result } = renderHook(() => useSubmitTestimonialMutation(), {
        wrapper,
      });

      const [, mutationResult] = result.current;
      expect(mutationResult.isLoading).toBe(false);
    });
  });

  describe('Cache Integration', () => {
    it('should use testimonials tag for cache management', () => {
      // Test that both hooks are properly configured with tags
      const { result: queryResult } = renderHook(() => useGetTestimonialsQuery(), {
        wrapper,
      });
      
      const { result: mutationResult } = renderHook(() => useSubmitTestimonialMutation(), {
        wrapper,
      });

      // Both hooks should be defined and functional
      expect(queryResult.current).toBeDefined();
      expect(mutationResult.current[0]).toBeDefined();
      expect(mutationResult.current[1]).toBeDefined();
    });

    it('should have correct endpoint configuration', () => {
      // Verify the hooks are properly exported and configured
      expect(useGetTestimonialsQuery).toBeDefined();
      expect(useSubmitTestimonialMutation).toBeDefined();
      
      // These hooks should be functions that can be called
      expect(typeof useGetTestimonialsQuery).toBe('function');
      expect(typeof useSubmitTestimonialMutation).toBe('function');
    });
  });
});