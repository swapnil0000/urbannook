import { apiSlice } from './apiSlice';

// Fields only the product page (getProductById) shows. Dropped from list
// queries; the first variant keeps its full gallery (home hero carousel of a
// single-variant product), other variants keep their first image.
const LIST_DROP = ['productDes', 'productSubDes', 'specifications', 'materialAndCare', 'disclaimer', 'packagingDimensions'];
const VARIANT_DROP = ['variantDes', 'specifications'];

function slimProduct(p) {
  if (!p || typeof p !== 'object') return p;
  const out = { ...p };
  for (const k of LIST_DROP) delete out[k];
  if (Array.isArray(p.variantDetails)) {
    out.variantDetails = p.variantDetails.map((v, i) => {
      const nv = { ...v };
      for (const k of VARIANT_DROP) delete nv[k];
      if (i > 0 && Array.isArray(v.variantImage)) nv.variantImage = v.variantImage.slice(0, 1);
      return nv;
    });
  }
  return out;
}

export function slimProductList(res) {
  const d = res?.data;
  if (!d) return res;
  const key = Array.isArray(d.products) ? 'products' : Array.isArray(d.listofPublishedProducts) ? 'listofPublishedProducts' : null;
  if (!key) return res;
  return { ...res, data: { ...d, [key]: d[key].map(slimProduct) } };
}

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
      // List cards need name, price, SKU and one image per variant — not every
      // description and gallery image. Trimming here keeps the server-rendered
      // page's preloaded state small (it was ~230 KB of the HTML on a product page).
      transformResponse: slimProductList,
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