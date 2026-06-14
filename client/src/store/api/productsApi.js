import { apiSlice } from './apiSlice';

export const productsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get all products with pagination and filters
    getProducts: builder.query({
      query: ({ page = 1, limit = 12, category, subCategory, search, sortBy } = {}) => {
        const params = new URLSearchParams({
          currentPage: page.toString(),
          limit: limit.toString(),
        });
        if (category) params.append('category', category);
        if (subCategory) params.append('subCategory', subCategory);
        if (search) params.append('search', search);
        if (sortBy) params.append('sortBy', sortBy);
        return `products?${params}`;
      },
      providesTags: ['Product'],
    }),

    // Get single product by ID
    getProductById: builder.query({
      query: (productId) => `product/${productId}`,
      providesTags: (result, error, productId) => [{ type: 'Product', id: productId }],
    }),

    // Get products filtered by category + optional subCategory
    getProductsByCategory: builder.query({
      query: ({ category, subCategory, page = 1, limit = 200 } = {}) => {
        const params = new URLSearchParams({
          currentPage: page.toString(),
          limit: limit.toString(),
        });
        if (category) params.append('category', category);
        if (subCategory) params.append('subCategory', subCategory);
        return `products?${params}`;
      },
      providesTags: ['Product'],
    }),

    // Get featured products
    getFeaturedProducts: builder.query({
      query: ({ limit = 6 } = {}) => {
        const params = new URLSearchParams({
          limit: limit.toString(),
          featured: 'true',
        });
        return `products?${params}`;
      },
      providesTags: ['Product'],
      keepUnusedDataFor: 600,
      refetchOnMountOrArgChange: 60,
    }),

    // Get all active categories (with subcategories + images from admin)
    getCategories: builder.query({
      query: () => 'categories',
      providesTags: ['Category'],
      keepUnusedDataFor: 600,
    }),

    // Search products
    searchProducts: builder.query({
      query: ({ search, page = 1, limit = 12 } = {}) => {
        const params = new URLSearchParams({
          currentPage: page.toString(),
          limit: limit.toString(),
        });
        if (search) params.append('search', search);
        return `products?${params}`;
      },
      providesTags: ['Product'],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useGetProductsByCategoryQuery,
  useGetFeaturedProductsQuery,
  useGetCategoriesQuery,
  useSearchProductsQuery,
} = productsApi;
