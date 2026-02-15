# Implementation Plan: Dynamic Testimonials System

## Overview

This implementation plan transforms the hardcoded testimonials component into a full-stack dynamic system. The approach follows existing project patterns: Mongoose model with validation, service layer for business logic, controller for request handling, RESTful routes, and RTK Query integration on the frontend. All testimonials are auto-approved for simplicity.

Implementation proceeds in layers: backend data model and API first, then frontend integration, followed by comprehensive testing. Each step builds incrementally with validation checkpoints.

## Tasks

- [x] 1. Set up backend data model and validation
  - [x] 1.1 Create Testimonial Mongoose model
    - Create `server/src/model/testimonial.model.js`
    - Define schema with fields: userName (required, 1-100 chars), userRole (optional, max 100 chars), userLocation (optional, max 150 chars), content (required, 10-500 chars), rating (required, 0-4 integer), colorTheme (optional, default value), isApproved (default true), productId (optional), userEmail (optional with email validation)
    - Add timestamps: true for automatic createdAt/updatedAt
    - Create compound index: `{ isApproved: 1, createdAt: -1 }`
    - Create index: `{ createdAt: -1 }`
    - Create index: `{ productId: 1 }`
    - Add schema-level validation for rating (min: 0, max: 4), content length (min: 10, max: 500), userName length (max: 100)
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 Write property test for testimonial model validation
    - **Property 3: Rating Validation**
    - **Validates: Requirements 1.3, 3.6**
    - Test that any testimonial with rating outside [0, 4] or non-integer rating is rejected
    - Generate random invalid ratings (negative, >4, decimals) and verify rejection
    - Use fast-check with 100 iterations

  - [ ] 1.3 Write unit tests for model edge cases
    - Test exactly 10 character content (boundary)
    - Test exactly 500 character content (boundary)
    - Test rating values 0 and 4 (boundaries)
    - Test optional fields present vs absent
    - Test invalid email format rejection
    - _Requirements: 1.1, 1.2, 1.3_

- [-] 2. Implement service layer business logic
  - [x] 2.1 Create testimonial service functions
    - Create `server/src/services/testimonial.service.js`
    - Implement `getApprovedTestimonialsService()`: Query `{ isApproved: true }`, sort by `createdAt: -1`, use `.lean()`, exclude `_id` and `__v` fields
    - Implement `createTestimonialService({ userName, userRole, userLocation, content, rating, colorTheme, productId, userEmail })`: Validate required fields, validate content length 10-500, validate rating 0-4 integer, create testimonial with `isApproved: true`, return success/error object
    - Return format: `{ success: boolean, statusCode: number, message: string, data: any }`
    - Handle validation errors with statusCode 400
    - Handle database errors with statusCode 500
    - _Requirements: 2.1, 2.2, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.7, 5.1_

  - [x] 2.2 Write property test for required field validation
    - **Property 7: Required Field Validation**
    - **Validates: Requirements 3.1, 3.2, 3.3**
    - Test that any submission missing userName, content, or rating is rejected with 400 error
    - Generate random testimonials with one or more required fields missing
    - Use fast-check with 100 iterations

  - [ ] 2.3 Write property test for content length validation
    - **Property 8: Content Length Validation**
    - **Validates: Requirements 3.4, 3.5**
    - Test that any submission with content <10 or >500 characters is rejected with 400 error
    - Generate random strings of invalid lengths
    - Use fast-check with 100 iterations

  - [ ] 2.4 Write property test for approved testimonials filtering
    - **Property 4: Approved Testimonials Filtering**
    - **Validates: Requirements 2.1**
    - Test that any query returns only testimonials where isApproved equals true
    - Create mix of approved and unapproved testimonials, verify query results
    - Use fast-check with 100 iterations

  - [ ] 2.5 Write property test for chronological sorting
    - **Property 5: Chronological Sorting**
    - **Validates: Requirements 2.2**
    - Test that any set of testimonials is returned sorted by createdAt descending
    - Generate random testimonials with different timestamps, verify sort order
    - Use fast-check with 100 iterations

  - [ ] 2.6 Write unit tests for service layer
    - Test empty testimonials array returns success with empty data
    - Test service error handling for database failures
    - Test auto-approval behavior (isApproved always true)
    - _Requirements: 2.3, 3.7, 5.1_

- [-] 3. Create middleware for security and rate limiting
  - [x] 3.1 Implement input sanitization middleware
    - Create `server/src/middleware/sanitization.middleware.js`
    - Install `sanitize-html` package: `npm install sanitize-html`
    - Create `sanitizeTestimonialInput` middleware function
    - Sanitize fields: userName, userRole, userLocation, content
    - Strip all HTML tags using sanitize-html with `allowedTags: []`
    - Preserve safe special characters (quotes, apostrophes, punctuation)
    - Apply `.trim()` to all sanitized fields
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 3.2 Write property test for HTML sanitization
    - **Property 11: HTML Sanitization**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
    - Test that any submission with HTML/script tags has them stripped while preserving safe characters
    - Generate random strings with HTML tags, verify sanitization
    - Use fast-check with 100 iterations

  - [x] 3.3 Implement rate limiting middleware
    - Create `server/src/middleware/rateLimiter.middleware.js`
    - Install `express-rate-limit` package: `npm install express-rate-limit`
    - Create `testimonialRateLimiter` with config: windowMs: 60 * 60 * 1000 (60 min), max: 3, keyGenerator: req.ip
    - Custom handler returns ApiError with statusCode 429 and retryAfter in seconds
    - _Requirements: 6.1, 6.4_

  - [ ] 3.4 Write unit test for rate limiting
    - Test that 4th submission within 60 minutes returns 429 error
    - Test that response includes retryAfter field
    - Mock time to avoid 60-minute wait
    - _Requirements: 6.1, 6.4_

- [-] 4. Implement controller and routes
  - [x] 4.1 Create testimonial controller
    - Create `server/src/controller/testimonial.controller.js`
    - Import ApiRes and ApiError from utils
    - Implement `getTestimonials(req, res)`: Call getApprovedTestimonialsService, return ApiRes on success, return ApiError on failure, wrap in try-catch with 500 error handling
    - Implement `submitTestimonial(req, res)`: Extract body fields, call createTestimonialService, return ApiRes with 201 on success, return ApiError on validation failure (400), wrap in try-catch with 500 error handling
    - _Requirements: 2.1, 2.2, 3.1-3.8, 10.1, 10.2, 10.3, 10.4, 10.8_

  - [x] 4.2 Create testimonial routes
    - Create `server/src/routes/testimonial.route.js`
    - Import express, controller functions, middleware
    - Define GET `/testimonials` route (public, no middleware)
    - Define POST `/testimonials` route with testimonialRateLimiter and sanitizeTestimonialInput middleware
    - Export router
    - _Requirements: 2.1, 3.1-3.8, 6.1_

  - [x] 4.3 Register routes in main app
    - Open `server/src/app.js`
    - Import testimonial routes
    - Register routes at `/api/v1/testimonials`
    - _Requirements: 2.1, 3.1-3.8_

  - [ ] 4.4 Write property test for response format consistency
    - **Property 12: Response Format Consistency**
    - **Validates: Requirements 10.1, 10.2, 10.3**
    - Test that any API request returns response with statusCode, message, data, success fields
    - Make various requests (valid, invalid, errors) and verify format
    - Use fast-check with 100 iterations

  - [ ] 4.5 Write unit tests for controller error handling
    - Test 400 response for validation failures
    - Test 429 response for rate limit
    - Test 500 response for server errors
    - _Requirements: 10.4, 10.7, 10.8_

- [ ] 5. Checkpoint - Backend API complete
  - Ensure all tests pass, ask the user if questions arise.

- [-] 6. Create frontend API integration with RTK Query
  - [x] 6.1 Create testimonials API slice
    - Create `client/src/store/api/testimonialsApi.js`
    - Import apiSlice from existing apiSlice file
    - Use `apiSlice.injectEndpoints()` pattern
    - Define `getTestimonials` query endpoint: `query: () => 'testimonials'`, `providesTags: ['Testimonials']`
    - Define `submitTestimonial` mutation endpoint: `query: (testimonialData) => ({ url: 'testimonials', method: 'POST', body: testimonialData })`, `invalidatesTags: ['Testimonials']`
    - Export hooks: `useGetTestimonialsQuery`, `useSubmitTestimonialMutation`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ] 6.2 Write unit tests for RTK Query hooks
    - Test that useGetTestimonialsQuery hook exists and fetches data
    - Test that useSubmitTestimonialMutation hook exists and submits data
    - Test cache invalidation after successful submission
    - _Requirements: 7.2, 7.3, 7.4_

- [-] 7. Update AireTestimonials component for dynamic data
  - [x] 7.1 Add form fields and state management
    - Open `client/src/pages/home/AireTestimonials.jsx`
    - Import `useGetTestimonialsQuery` and `useSubmitTestimonialMutation` from testimonialsApi
    - Add state: `userName`, `userRole`, `userLocation` (in addition to existing `reviewText` and `mood`)
    - Add state: `errorMessage` for displaying errors
    - Replace hardcoded testimonials array with: `const { data: testimonialsData, isLoading, error } = useGetTestimonialsQuery()`
    - Extract testimonials: `const testimonials = testimonialsData?.data?.testimonials || []`
    - _Requirements: 7.2, 8.1, 9.1_

  - [x] 7.2 Update form submission handler
    - Get mutation hook: `const [submitTestimonial, { isLoading: isSubmitting }] = useSubmitTestimonialMutation()`
    - Update `handleSubmit` to async function
    - Call `await submitTestimonial({ userName, userRole: userRole || undefined, userLocation: userLocation || undefined, content: reviewText, rating: mood }).unwrap()`
    - On success: Set formState to 'success', play success sound, clear all form fields (userName, userRole, userLocation, reviewText), reset mood to 4, setTimeout to reset formState after 4 seconds
    - On error: Set formState to 'error', extract error message from err.data, set errorMessage state, setTimeout to reset formState after 4 seconds
    - Handle specific error codes: 429 (rate limit with retry time), 400 (validation errors), generic fallback
    - _Requirements: 3.1-3.8, 8.1, 8.2, 8.3, 8.4_

  - [x] 7.3 Add form input fields to UI
    - Add input field for userName (required, placeholder: "Your Name")
    - Add input field for userRole (optional, placeholder: "e.g., Art Enthusiast")
    - Add input field for userLocation (optional, placeholder: "e.g., Bangalore")
    - Keep existing textarea for content (reviewText)
    - Keep existing mood selector (0-4 rating)
    - Style inputs to match existing form design
    - _Requirements: 3.1, 3.2, 11.4_

  - [x] 7.4 Add loading and error states to UI
    - Show loading skeleton/spinner when `isLoading === true` on initial load
    - Show "Processing..." text and disable submit button when `isSubmitting === true`
    - Keep existing success overlay animation (formState === 'success')
    - Add error overlay similar to success overlay but with red theme when `formState === 'error'`
    - Display errorMessage in error overlay
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 7.5 Add empty state handling
    - Check if `testimonials.length === 0` after loading completes
    - Display placeholder message: "No testimonials yet. Be the first to share your experience!"
    - Hide prev/next navigation controls when `testimonials.length < 2`
    - Maintain visual layout consistency in empty state
    - _Requirements: 9.1, 9.2_

  - [ ] 7.6 Write unit tests for component UI states
    - Test loading state displays skeleton
    - Test empty state displays placeholder message
    - Test navigation controls hidden with <2 testimonials
    - Test form submission triggers loading state
    - Test success state displays animation
    - Test error state displays error message
    - Test form fields clear after successful submission
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2_

- [-] 8. Integration testing and validation
  - [x] 8.1 Write property test for submission round-trip
    - **Property 10: Submission Round-Trip**
    - **Validates: Requirements 5.2**
    - Test that any valid testimonial submission appears in query results immediately after
    - Submit random testimonials, query for testimonials, verify new one is present
    - Use fast-check with 100 iterations

  - [ ] 8.2 Write property test for required fields presence
    - **Property 1: Required Fields Presence**
    - **Validates: Requirements 1.1, 1.4**
    - Test that any stored testimonial contains userName, content, rating, isApproved, createdAt, updatedAt with correct types
    - Generate random valid testimonials, verify all required fields present
    - Use fast-check with 100 iterations

  - [ ] 8.3 Write property test for optional fields storage
    - **Property 2: Optional Fields Storage**
    - **Validates: Requirements 1.2**
    - Test that any testimonial with optional fields stores them correctly, and testimonials without optional fields don't have them
    - Generate random testimonials with/without optional fields
    - Use fast-check with 100 iterations

  - [ ] 8.4 Write property test for auto-approval behavior
    - **Property 9: Auto-Approval Behavior**
    - **Validates: Requirements 3.7, 5.1**
    - Test that any valid testimonial submission has isApproved set to true
    - Generate random valid testimonials, verify isApproved is true
    - Use fast-check with 100 iterations

  - [ ] 8.5 Write property test for field exclusion in responses
    - **Property 6: Field Exclusion in Responses**
    - **Validates: Requirements 2.4**
    - Test that any testimonial returned by API doesn't contain _id or __v fields
    - Query testimonials, verify MongoDB internal fields excluded
    - Use fast-check with 100 iterations

  - [ ] 8.6 Write property test for validation error status codes
    - **Property 13: Validation Error Status Codes**
    - **Validates: Requirements 10.4**
    - Test that any validation failure returns 400 status code
    - Generate random invalid testimonials (missing fields, invalid length, invalid rating)
    - Use fast-check with 100 iterations

  - [ ] 8.7 Write integration tests for end-to-end flows
    - Test complete submission flow: form fill → submit → success → refetch → new testimonial appears
    - Test rate limiting: submit 3 testimonials → 4th returns 429
    - Test XSS protection: submit with HTML tags → verify tags stripped in response
    - Test empty state → submit testimonial → empty state disappears
    - _Requirements: 5.2, 6.1, 4.1-4.5, 9.1_

- [ ] 9. Final checkpoint and cleanup
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties with 100 iterations each
- Unit tests validate specific examples and edge cases
- Follow existing project patterns: Mongoose models, service layer, controller, RTK Query
- Use console.log for logging (no Winston)
- All testimonials auto-approved (isApproved: true) for simplicity
