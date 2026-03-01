import { apiSlice } from './apiSlice';

export const productsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get all products with pagination and filters
    getProducts: builder.query({
      query: ({ page = 1, limit = 12, category, search, sortBy } = {}) => {
        const params = new URLSearchParams({
          currentPage: page.toString(),
          limit: limit.toString(),
        });
        if (category) params.append('category', category);
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
    
    // Get products by category
    getProductsByCategory: builder.query({
      query: ({ category, page = 1, limit = 12 } = {}) => {
        const params = new URLSearchParams({
          currentPage: page.toString(),
          limit: limit.toString(),
        });
        if (category) params.append('category', category);
        
        return `products?${params}`;
      },
      providesTags: ['Product'],
    }),
    
    // Get featured products
    getFeaturedProducts: builder.query({
      query: ({ limit = 6 } = {}) => {
        const params = new URLSearchParams({
          limit: limit.toString(),
          featured: 'true'
        });
        return `products?${params}`;
      },
      providesTags: ['Product'],
      // Enhanced caching for featured products
      keepUnusedDataFor: 600, // Keep for 10 minutes
      refetchOnMountOrArgChange: 60, // Only refetch if older than 1 minute
    }),
    
    // Get product categories
    getCategories: builder.query({
      query: () => 'products/categories',
      providesTags: ['Category'],
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