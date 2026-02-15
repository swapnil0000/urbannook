# Design Document: Dynamic Testimonials System

## Overview

The Dynamic Testimonials System transforms the existing hardcoded AireTestimonials component into a full-stack feature with MongoDB persistence, RESTful API endpoints, and RTK Query integration. The system maintains the existing UI/UX design while adding database-backed storage, input validation, XSS protection, and rate limiting.

The architecture follows the existing project patterns: Mongoose models with indexes, service-layer business logic, controller-based request handling, and RTK Query hooks for frontend API integration. All testimonials are automatically approved upon submission for simplicity.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (React)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  AireTestimonials.jsx                                │  │
│  │  - Carousel Display                                  │  │
│  │  - Review Submission Form                            │  │
│  │  - Mood Selector (0-4)                               │  │
│  └────────────┬─────────────────────────────────────────┘  │
│               │                                             │
│  ┌────────────▼─────────────────────────────────────────┐  │
│  │  testimonialsApi (RTK Query)                         │  │
│  │  - useGetTestimonialsQuery                           │  │
│  │  - useSubmitTestimonialMutation                      │  │
│  └────────────┬─────────────────────────────────────────┘  │
└───────────────┼─────────────────────────────────────────────┘
                │ HTTP/JSON
┌───────────────▼─────────────────────────────────────────────┐
│                   Server (Express)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Routes (/api/v1/testimonials)                       │  │
│  │  - GET  /testimonials                                │  │
│  │  - POST /testimonials                                │  │
│  └────────────┬─────────────────────────────────────────┘  │
│               │                                             │
│  ┌────────────▼─────────────────────────────────────────┐  │
│  │  Middleware                                          │  │
│  │  - Rate Limiter (IP-based, 3 req/60min)             │  │
│  │  - Input Sanitization (XSS protection)              │  │
│  └────────────┬─────────────────────────────────────────┘  │
│               │                                             │
│  ┌────────────▼─────────────────────────────────────────┐  │
│  │  Controller (testimonial.controller.js)              │  │
│  │  - getTestimonials                                   │  │
│  │  - submitTestimonial                                 │  │
│  └────────────┬─────────────────────────────────────────┘  │
│               │                                             │
│  ┌────────────▼─────────────────────────────────────────┐  │
│  │  Service (testimonial.service.js)                    │  │
│  │  - getApprovedTestimonialsService                    │  │
│  │  - createTestimonialService                          │  │
│  └────────────┬─────────────────────────────────────────┘  │
│               │                                             │
│  ┌────────────▼─────────────────────────────────────────┐  │
│  │  Model (testimonial.model.js)                        │  │
│  │  - Mongoose Schema                                   │  │
│  │  - Validation Rules                                  │  │
│  │  - Indexes                                           │  │
│  └────────────┬─────────────────────────────────────────┘  │
└───────────────┼─────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────┐
│                   MongoDB Database                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  testimonials Collection                             │  │
│  │  - Indexed by: isApproved, createdAt                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Testimonial Retrieval Flow**:
   - User visits homepage → AireTestimonials component mounts
   - Component calls `useGetTestimonialsQuery()` hook
   - RTK Query sends GET request to `/api/v1/testimonials`
   - Controller calls service layer
   - Service queries MongoDB for `{ isApproved: true }` documents
   - Results sorted by `createdAt` descending
   - Response cached by RTK Query
   - Carousel displays testimonials

2. **Testimonial Submission Flow**:
   - User fills form (name, role, location, content, mood rating)
   - User clicks "Post Review"
   - Component calls `useSubmitTestimonialMutation()` hook
   - RTK Query sends POST request to `/api/v1/testimonials`
   - Rate limiter middleware checks IP submission count
   - Sanitization middleware cleans input (XSS protection)
   - Controller validates required fields and constraints
   - Service creates testimonial with `isApproved: true`
   - MongoDB saves document
   - Success response triggers UI animation
   - RTK Query invalidates testimonials cache
   - Carousel refetches and displays new testimonial

## Components and Interfaces

### Backend Components

#### 1. Testimonial Model (`server/src/model/testimonial.model.js`)

**Schema Definition**:
```javascript
{
  userName: String (required, trimmed, max 100 chars),
  userRole: String (optional, trimmed, max 100 chars),
  userLocation: String (optional, trimmed, max 150 chars),
  content: String (required, trimmed, min 10 chars, max 500 chars),
  rating: Number (required, min 0, max 4, integer),
  colorTheme: String (optional, default: "bg-emerald-100 text-emerald-700"),
  isApproved: Boolean (default: true),
  productId: String (optional),
  userEmail: String (optional, validated email format),
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-generated)
}
```

**Indexes**:
- `{ isApproved: 1, createdAt: -1 }` - Compound index for efficient approved testimonial queries
- `{ createdAt: -1 }` - For chronological sorting
- `{ productId: 1 }` - Optional future feature for product-specific testimonials

**Validation Rules**:
- `userName`: Required, 1-100 characters
- `content`: Required, 10-500 characters
- `rating`: Required, integer 0-4
- `userEmail`: Optional, valid email format if provided

#### 2. Testimonial Service (`server/src/services/testimonial.service.js`)

**Functions**:

```javascript
getApprovedTestimonialsService()
```
- Queries: `Testimonial.find({ isApproved: true }).sort({ createdAt: -1 }).lean()`
- Returns: `{ success: true, statusCode: 200, message: string, data: testimonials[] }`
- Error handling: Returns error object with success: false

```javascript
createTestimonialService({ userName, userRole, userLocation, content, rating, colorTheme, productId, userEmail })
```
- Validates: All required fields present, content length 10-500, rating 0-4
- Creates: New testimonial document with `isApproved: true`
- Returns: `{ success: true, statusCode: 201, message: "Testimonial submitted successfully", data: testimonial }`
- Error handling: Returns validation errors with statusCode 400

#### 3. Testimonial Controller (`server/src/controller/testimonial.controller.js`)

**Endpoints**:

```javascript
getTestimonials(req, res)
```
- Method: GET
- Route: `/api/v1/testimonials`
- Auth: None (public)
- Response: ApiRes with testimonials array
- Error: ApiError with 500 on server errors

```javascript
submitTestimonial(req, res)
```
- Method: POST
- Route: `/api/v1/testimonials`
- Auth: None (public)
- Body: `{ userName, userRole?, userLocation?, content, rating, colorTheme?, productId?, userEmail? }`
- Validation: Sanitized input, rate limit checked
- Response: ApiRes with created testimonial (201)
- Errors: 
  - 400: Validation failure
  - 429: Rate limit exceeded
  - 500: Server error

#### 4. Rate Limiter Middleware (`server/src/middleware/rateLimiter.middleware.js`)

**Configuration**:
```javascript
const testimonialRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 60 minutes
  max: 3, // 3 requests per window
  message: "Too many testimonials submitted. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip, // Track by IP address
  handler: (req, res) => {
    const retryAfter = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
    res.status(429).json(
      new ApiError(429, "Rate limit exceeded", { retryAfter }, false)
    );
  }
})
```

**Behavior**:
- Tracks submissions by IP address
- Allows 3 submissions per 60-minute window
- Returns 429 status with retry time on limit exceeded
- Resets counter after window expires

#### 5. Sanitization Middleware (`server/src/middleware/sanitization.middleware.js`)

**Implementation**:
```javascript
import sanitizeHtml from 'sanitize-html';

const sanitizeTestimonialInput = (req, res, next) => {
  const fieldsToSanitize = ['userName', 'userRole', 'userLocation', 'content'];
  
  fieldsToSanitize.forEach(field => {
    if (req.body[field]) {
      req.body[field] = sanitizeHtml(req.body[field], {
        allowedTags: [], // Strip all HTML tags
        allowedAttributes: {},
        disallowedTagsMode: 'discard'
      }).trim();
    }
  });
  
  next();
};
```

**Protection**:
- Removes all HTML tags from text fields
- Prevents XSS injection attacks
- Preserves safe special characters (quotes, punctuation)
- Applied before controller validation

#### 6. Routes (`server/src/routes/testimonial.route.js`)

```javascript
import express from 'express';
import { getTestimonials, submitTestimonial } from '../controller/testimonial.controller.js';
import { testimonialRateLimiter } from '../middleware/rateLimiter.middleware.js';
import { sanitizeTestimonialInput } from '../middleware/sanitization.middleware.js';

const router = express.Router();

router.get('/testimonials', getTestimonials);
router.post('/testimonials', testimonialRateLimiter, sanitizeTestimonialInput, submitTestimonial);

export default router;
```

### Frontend Components

#### 1. Testimonials API (`client/src/store/api/testimonialsApi.js`)

**RTK Query Endpoints**:

```javascript
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
```

**Cache Behavior**:
- `getTestimonials`: Cached with 'Testimonials' tag
- `submitTestimonial`: Invalidates 'Testimonials' tag on success
- Automatic refetch after successful submission

#### 2. Updated AireTestimonials Component

**State Management**:
```javascript
const [activeIndex, setActiveIndex] = useState(0);
const [mood, setMood] = useState(4); // 0-4 scale
const [reviewText, setReviewText] = useState("");
const [userName, setUserName] = useState("");
const [userRole, setUserRole] = useState("");
const [userLocation, setUserLocation] = useState("");
const [formState, setFormState] = useState('idle'); // idle | submitting | success | error
```

**API Integration**:
```javascript
const { data: testimonialsData, isLoading, error } = useGetTestimonialsQuery();
const [submitTestimonial, { isLoading: isSubmitting }] = useSubmitTestimonialMutation();

const testimonials = testimonialsData?.data?.testimonials || [];
```

**Form Submission Handler**:
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setFormState('submitting');
  
  try {
    await submitTestimonial({
      userName,
      userRole: userRole || undefined,
      userLocation: userLocation || undefined,
      content: reviewText,
      rating: mood,
    }).unwrap();
    
    setFormState('success');
    playSound('success');
    
    // Clear form
    setReviewText("");
    setUserName("");
    setUserRole("");
    setUserLocation("");
    setMood(4);
    
    setTimeout(() => setFormState('idle'), 4000);
  } catch (err) {
    setFormState('error');
    console.error('Submission failed:', err);
    setTimeout(() => setFormState('idle'), 4000);
  }
};
```

**Loading States**:
- Initial load: Show skeleton/spinner while `isLoading === true`
- Empty state: Show placeholder message when `testimonials.length === 0`
- Submission: Disable form and show "Processing..." when `isSubmitting === true`
- Success: Show success animation overlay for 4 seconds
- Error: Show error message with retry option

**Error Handling**:
```javascript
{formState === 'error' && (
  <div className="absolute inset-0 z-50 bg-red-50/95 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8">
    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
      <i className="fa-solid fa-exclamation text-3xl text-red-600"></i>
    </div>
    <h3 className="text-3xl font-serif text-slate-900 mb-2">Oops!</h3>
    <p className="text-slate-500 text-sm">Something went wrong. Please try again.</p>
  </div>
)}
```

## Data Models

### Testimonial Document

```javascript
{
  _id: ObjectId("..."),
  userName: "Aditi Rao",
  userRole: "Art Enthusiast",
  userLocation: "Koramangala, Bangalore",
  content: "I ordered a custom lithophane lamp for my parents' anniversary...",
  rating: 4, // 0=Poor, 1=Fair, 2=Good, 3=Great, 4=Amazing
  colorTheme: "bg-emerald-100 text-emerald-700",
  isApproved: true,
  productId: null,
  userEmail: null,
  createdAt: ISODate("2024-01-15T10:30:00.000Z"),
  updatedAt: ISODate("2024-01-15T10:30:00.000Z")
}
```

### API Request/Response Formats

**GET /api/v1/testimonials**

Response (200 OK):
```json
{
  "statusCode": 200,
  "message": "Testimonials fetched successfully",
  "data": {
    "testimonials": [
      {
        "userName": "Aditi Rao",
        "userRole": "Art Enthusiast",
        "userLocation": "Koramangala, Bangalore",
        "content": "I ordered a custom lithophane lamp...",
        "rating": 4,
        "colorTheme": "bg-emerald-100 text-emerald-700",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  },
  "success": true
}
```

**POST /api/v1/testimonials**

Request Body:
```json
{
  "userName": "Rohan Das",
  "userRole": "Bike Lover",
  "userLocation": "Pune, Maharashtra",
  "content": "Got a custom keychain for my bike keys. The dual-color filament looks insane...",
  "rating": 4,
  "colorTheme": "bg-blue-100 text-blue-700"
}
```

Response (201 Created):
```json
{
  "statusCode": 201,
  "message": "Testimonial submitted successfully",
  "data": {
    "testimonial": {
      "userName": "Rohan Das",
      "userRole": "Bike Lover",
      "userLocation": "Pune, Maharashtra",
      "content": "Got a custom keychain for my bike keys...",
      "rating": 4,
      "colorTheme": "bg-blue-100 text-blue-700",
      "isApproved": true,
      "createdAt": "2024-01-15T11:00:00.000Z"
    }
  },
  "success": true
}
```

Error Response (400 Bad Request):
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "data": {
    "errors": [
      "Content must be between 10 and 500 characters",
      "Rating must be between 0 and 4"
    ]
  },
  "success": false
}
```

Error Response (429 Too Many Requests):
```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded",
  "data": {
    "retryAfter": 3420
  },
  "success": false
}
```


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property Reflection

After analyzing all acceptance criteria, I identified the following redundancies:
- Properties 1.3 and 3.6 both test rating validation (0-4 range) - can be combined
- Properties 3.7 and 5.1 both test auto-approval behavior - can be combined
- Properties 4.1, 4.2, 4.3, 4.4 all test HTML sanitization on different fields - can be combined into one comprehensive property
- Properties 10.1, 10.2, 10.3 all test response format structure - can be combined

The following properties provide unique validation value and will be implemented:

### Property 1: Required Fields Presence
*For any* valid testimonial submission, the stored document should contain userName, content, rating, isApproved, createdAt, and updatedAt fields with correct types.

**Validates: Requirements 1.1, 1.4**

### Property 2: Optional Fields Storage
*For any* testimonial submission with optional fields (userRole, userLocation, colorTheme, productId, userEmail), those fields should be stored correctly when provided and absent when not provided.

**Validates: Requirements 1.2**

### Property 3: Rating Validation
*For any* testimonial submission with rating outside the range [0, 4] or non-integer rating, the system should reject the submission with a 400 error.

**Validates: Requirements 1.3, 3.6**

### Property 4: Approved Testimonials Filtering
*For any* database state containing both approved and unapproved testimonials, querying for testimonials should return only those where isApproved equals true.

**Validates: Requirements 2.1**

### Property 5: Chronological Sorting
*For any* set of testimonials with different createdAt timestamps, the query results should be sorted in descending order by createdAt (newest first).

**Validates: Requirements 2.2**

### Property 6: Field Exclusion in Responses
*For any* testimonial returned by the API, the response should not contain MongoDB internal fields (_id, __v).

**Validates: Requirements 2.4**

### Property 7: Required Field Validation
*For any* testimonial submission missing userName, content, or rating, the system should reject the submission with a 400 error indicating which field is missing.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 8: Content Length Validation
*For any* testimonial submission where content length is less than 10 characters or greater than 500 characters, the system should reject the submission with a 400 error.

**Validates: Requirements 3.4, 3.5**

### Property 9: Auto-Approval Behavior
*For any* valid testimonial submission, the stored document should have isApproved set to true automatically.

**Validates: Requirements 3.7, 5.1**

### Property 10: Submission Round-Trip
*For any* valid testimonial submission, querying for testimonials immediately after submission should include the newly submitted testimonial in the results.

**Validates: Requirements 5.2**

### Property 11: HTML Sanitization
*For any* testimonial submission containing HTML tags or script elements in userName, userRole, userLocation, or content fields, those tags should be stripped from the stored document while preserving safe special characters (quotes, apostrophes, punctuation).

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

### Property 12: Response Format Consistency
*For any* API request (successful or failed), the response should contain statusCode, message, data, and success fields matching the ApiRes or ApiError format.

**Validates: Requirements 10.1, 10.2, 10.3**

### Property 13: Validation Error Status Codes
*For any* testimonial submission that fails validation (missing fields, invalid length, invalid rating), the response should have a 400 status code.

**Validates: Requirements 10.4**

## Error Handling

### Validation Errors (400)

**Scenarios**:
- Missing required fields (userName, content, rating)
- Content length < 10 or > 500 characters
- Rating not in range [0, 4]
- Rating not an integer
- Invalid email format (if userEmail provided)

**Response Format**:
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "data": {
    "errors": ["Specific error message 1", "Specific error message 2"]
  },
  "success": false
}
```

**Implementation**:
```javascript
// In service layer
if (!userName || !content || rating === undefined) {
  return {
    success: false,
    statusCode: 400,
    message: "Validation failed",
    data: { errors: ["userName, content, and rating are required"] }
  };
}

if (content.length < 10 || content.length > 500) {
  return {
    success: false,
    statusCode: 400,
    message: "Validation failed",
    data: { errors: ["Content must be between 10 and 500 characters"] }
  };
}

if (rating < 0 || rating > 4 || !Number.isInteger(rating)) {
  return {
    success: false,
    statusCode: 400,
    message: "Validation failed",
    data: { errors: ["Rating must be an integer between 0 and 4"] }
  };
}
```

### Rate Limit Errors (429)

**Scenario**: More than 3 submissions from same IP within 60 minutes

**Response Format**:
```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded",
  "data": {
    "retryAfter": 3420
  },
  "success": false
}
```

**Implementation**: Handled by express-rate-limit middleware

### Server Errors (500)

**Scenarios**:
- Database connection failures
- Unexpected exceptions
- MongoDB query errors

**Response Format**:
```json
{
  "statusCode": 500,
  "message": "Internal Server Error - [error details]",
  "data": null,
  "success": false
}
```

**Implementation**:
```javascript
// In controller
try {
  const result = await createTestimonialService(req.body);
  // ... handle result
} catch (error) {
  console.error('Testimonial submission error:', error);
  return res.status(500).json(
    new ApiError(500, `Internal Server Error - ${error.message}`, null, false)
  );
}
```

### Frontend Error Handling

**Network Errors**:
```javascript
try {
  await submitTestimonial(data).unwrap();
} catch (err) {
  if (err.status === 429) {
    // Show rate limit message with retry time
    const retryMinutes = Math.ceil(err.data.data.retryAfter / 60);
    setErrorMessage(`Too many submissions. Please try again in ${retryMinutes} minutes.`);
  } else if (err.status === 400) {
    // Show validation errors
    setErrorMessage(err.data.data.errors.join(', '));
  } else {
    // Generic error
    setErrorMessage('Something went wrong. Please try again.');
  }
  setFormState('error');
}
```

**Loading State Errors**:
```javascript
const { data, isLoading, error } = useGetTestimonialsQuery();

if (error) {
  return (
    <div className="text-center p-8">
      <p className="text-red-600">Failed to load testimonials</p>
      <button onClick={() => refetch()}>Retry</button>
    </div>
  );
}
```

## Testing Strategy

### Dual Testing Approach

The testimonials system requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, and integration points
- Empty testimonials array handling
- Rate limit boundary (exactly 3 submissions)
- Specific HTML injection attempts (e.g., `<script>alert('xss')</script>`)
- UI component rendering with mock data
- RTK Query cache invalidation behavior

**Property-Based Tests**: Verify universal properties across all inputs
- All correctness properties listed above
- Minimum 100 iterations per property test
- Random data generation for testimonials, ratings, content lengths
- Comprehensive input coverage through randomization

### Property-Based Testing Configuration

**Library**: Use `fast-check` for JavaScript/TypeScript property-based testing

**Installation**:
```bash
npm install --save-dev fast-check
```

**Test Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `Feature: testimonials-system, Property {N}: {property_text}`

**Example Property Test**:
```javascript
import fc from 'fast-check';
import { createTestimonialService } from '../services/testimonial.service';

describe('Feature: testimonials-system, Property 3: Rating Validation', () => {
  it('should reject testimonials with ratings outside [0, 4]', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: -1000, max: -1 }).chain(invalidRating =>
          fc.record({
            userName: fc.string({ minLength: 1, maxLength: 100 }),
            content: fc.string({ minLength: 10, maxLength: 500 }),
            rating: fc.constant(invalidRating)
          })
        ),
        async (testimonial) => {
          const result = await createTestimonialService(testimonial);
          expect(result.success).toBe(false);
          expect(result.statusCode).toBe(400);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing Examples

**Service Layer Tests**:
```javascript
describe('Testimonial Service', () => {
  it('should reject empty content', async () => {
    const result = await createTestimonialService({
      userName: 'Test User',
      content: '',
      rating: 4
    });
    
    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.data.errors).toContain('Content must be between 10 and 500 characters');
  });
  
  it('should handle exactly 3 rate limit submissions', async () => {
    // Test boundary condition
  });
});
```

**Frontend Component Tests**:
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import AireTestimonials from './AireTestimonials';

describe('AireTestimonials Component', () => {
  it('should display placeholder when no testimonials exist', () => {
    render(<AireTestimonials />, {
      preloadedState: {
        testimonials: { data: { testimonials: [] } }
      }
    });
    
    expect(screen.getByText(/no testimonials yet/i)).toBeInTheDocument();
  });
  
  it('should hide navigation controls with fewer than 2 testimonials', () => {
    render(<AireTestimonials />, {
      preloadedState: {
        testimonials: { data: { testimonials: [mockTestimonial] } }
      }
    });
    
    expect(screen.queryByRole('button', { name: /prev/i })).not.toBeInTheDocument();
  });
});
```

### Test Coverage Goals

- Service layer: 90%+ code coverage
- Controller layer: 85%+ code coverage
- Model validation: 100% coverage
- Frontend components: 80%+ coverage
- Property tests: All 13 correctness properties implemented
- Unit tests: All edge cases and error conditions covered
