import { apiSlice } from './apiSlice';

export const testimonialsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Global homepage testimonials
    getTestimonials: builder.query({
      query: () => 'testimonials',
      providesTags: ['Testimonials'],
    }),
    submitTestimonial: builder.mutation({
      query: (testimonialData) => ({
        url: 'testimonials',
        method: 'POST',
        body: testimonialData,
      }),
      invalidatesTags: ['Testimonials'],
    }),

    // Product-specific reviews
    getProductReviews: builder.query({
      query: ({ productId, userId }) => `specific/review?productId=${productId}`,
      providesTags: (_, __, { productId }) => [{ type: 'ProductReviews', id: productId }],
    }),
    submitProductReview: builder.mutation({
      query: (formData) => ({
        url: 'specific/review',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: (_, __, arg) => [{ type: 'ProductReviews', id: arg.get?.('productId') }],
    }),
    updateProductReview: builder.mutation({
      query: ({ reviewId, formData }) => ({
        url: `specific/review/${reviewId}`,
        method: 'PATCH',
        body: formData,
      }),
      invalidatesTags: (_, __, arg) => [{ type: 'ProductReviews', id: arg.formData?.get?.('productId') }],
    }),
  }),
});

export const {
  useGetTestimonialsQuery,
  useSubmitTestimonialMutation,
  useGetProductReviewsQuery,
  useSubmitProductReviewMutation,
  useUpdateProductReviewMutation,
} = testimonialsApi;
