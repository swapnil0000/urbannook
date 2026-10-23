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
      query: () => 'categories',
      providesTags: ['Category'],
    }),

    // Admin → SEO Pages overrides for one URL path; data is null when none.
    getSeoData: builder.query({
      query: (path) => `seo?path=${encodeURIComponent(path)}`,
      providesTags: (result, error, path) => [{ type: 'Seo', id: path }],
      keepUnusedDataFor: 600,
    }),

    // Published blog posts (Admin → Blog), newest first. `product` filters to
    // posts linked to that product (the "Read the story" link on its page).
    getBlogPosts: builder.query({
      query: ({ product, sku, series, limit = 50 } = {}) => {
        const params = new URLSearchParams({ limit: String(limit) });
        if (product) params.append('product', product);
        if (sku) params.append('sku', sku);
        if (series) params.append('series', series);
        return `blog?${params}`;
      },
      providesTags: ['Blog'],
    }),

    // One published post with its linked products.
    getBlogPost: builder.query({
      query: (slug) => `blog/${encodeURIComponent(slug)}`,
      providesTags: (result, error, slug) => [{ type: 'Blog', id: slug }],
    }),

    // One category page: name, indexable flag, products
    getCategoryBySlug: builder.query({
      query: (slug) => `category/${encodeURIComponent(slug)}`,
      providesTags: (result, error, slug) => [{ type: 'Category', id: slug }],
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
  useGetCategoryBySlugQuery,
  useGetSeoDataQuery,
  useGetBlogPostsQuery,
  useGetBlogPostQuery,
  useSearchProductsQuery,
} = productsApi;