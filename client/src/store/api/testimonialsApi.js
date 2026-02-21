import { apiSlice } from './apiSlice';

export const testimonialsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
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
  }),
});

export const {
  useGetTestimonialsQuery,
  useSubmitTestimonialMutation,
} = testimonialsApi;