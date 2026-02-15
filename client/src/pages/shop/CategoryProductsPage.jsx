import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productCategories, priceRanges, sortOptions } from '../../data/products';
import { useGetProductsByCategoryQuery } from '../../store/api/productsApi';
import WishlistButton from '../../component/WishlistButton';

const CategoryProductsPage = () => {
  const { category } = useParams();
  const navigate = useNavigate();
  const [selectedPriceRange, setSelectedPriceRange] = useState(null);
  const [selectedRating, setSelectedRating] = useState(null);
  const [sortBy, setSortBy] = useState('featured');
  const [showFilters, setShowFilters] = useState(false);

  // API call for category products
  const { data: productsResponse, isLoading, error } = useGetProductsByCategoryQuery({
    category,
    page: 1,
    limit: 20
  });

  const categoryInfo = productCategories.find(cat => cat.id === category);
  const categoryProducts = productsResponse?.data?.listOfProducts?.listOfProducts || [];

  const filteredProducts = useMemo(() => {
    let filtered = [...categoryProducts];

    if (selectedPriceRange) {
      filtered = filtered.filter(p => 
        p.sellingPrice >= selectedPriceRange.min && p.sellingPrice <= selectedPriceRange.max
      );
    }

    if (selectedRating) {
      filtered = filtered.filter(p => (p.rating || 4.5) >= selectedRating);
    }

    switch (sortBy) {
      case 'price-low-high':
        filtered.sort((a, b) => a.sellingPrice - b.sellingPrice);
        break;
      case 'price-high-low':
        filtered.sort((a, b) => b.sellingPrice - a.sellingPrice);
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 4.5) - (a.rating || 4.5));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now()));
        break;
      default:
        break;
    }

    return filtered;
  }, [categoryProducts, selectedPriceRange, selectedRating, sortBy]);

  const clearFilters = () => {
    setSelectedPriceRange(null);
    setSelectedRating(null);
    setSortBy('featured');
  };

  if (!categoryInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-textPrimary mb-4">Category not found</h2>
          <button onClick={() => navigate('/products')} className="px-6 py-3 bg-primary text-white rounded-lg">
            View All Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bgPrimary">
      
      {/* Hero Section */}
      <section className="py-16 px-8 bg-gradient-to-br from-bgSecondary via-accent/5 to-primary/10 mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 text-textSecondary mb-4">
            <a href="/" className="hover:text-primary">Home</a>
            <i className="fa-solid fa-chevron-right text-xs"></i>
            <a href="/products" className="hover:text-primary">Products</a>
            <i className="fa-solid fa-chevron-right text-xs"></i>
            <span className="text-textPrimary font-semibold">{categoryInfo.name}</span>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <i className={`${categoryInfo.icon} text-2xl text-primary`}></i>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-textPrimary">{categoryInfo.name}</h1>
              <p className="text-textSecondary text-lg">{categoryInfo.description}</p>
            </div>
          </div>
          <p className="text-textSecondary">
            <span className="font-semibold text-textPrimary">{categoryProducts.length}</span> products available
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-8">
            {/* Filters Sidebar */}
            <div className={`${showFilters ? 'block' : 'hidden'} lg:block w-full lg:w-80 bg-bgSecondary rounded-2xl p-6 h-fit sticky top-4`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-textPrimary">Filters</h3>
                <button onClick={clearFilters} className="text-primary text-sm font-semibold hover:underline">
                  Clear All
                </button>
              </div>

              {/* Rating Filter */}
              <div className="mb-6">
                <h4 className="font-semibold text-textPrimary mb-3">Minimum Rating</h4>
                <div className="space-y-2">
                  {[4.5, 4.0, 3.5, 3.0].map(rating => (
                    <label key={rating} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={selectedRating === rating}
                        onChange={() => setSelectedRating(rating)}
                        className="w-4 h-4 text-primary"
                      />
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <i key={i} className={`fa-solid fa-star text-xs ${
                            i < Math.floor(rating) ? 'text-warning' : 'text-borderSecondary'
                          }`} />
                        ))}
                        <span className="text-textSecondary text-sm ml-1">& up</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Filter */}
              <div className="mb-6">
                <h4 className="font-semibold text-textPrimary mb-3">Price Range</h4>
                <div className="space-y-2">
                  {priceRanges.map(range => (
                    <label key={range.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={selectedPriceRange?.id === range.id}
                        onChange={() => setSelectedPriceRange(range)}
                        className="w-4 h-4 text-primary"
                      />
                      <span className="text-textSecondary">{range.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Other Categories */}
              <div>
                <h4 className="font-semibold text-textPrimary mb-3">Other Categories</h4>
                <div className="space-y-2">
                  {productCategories.filter(cat => cat.id !== category).map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => navigate(`/category/${cat.id}`)}
                      className="w-full text-left px-3 py-2 rounded-lg text-textSecondary hover:bg-bgPrimary hover:text-primary transition-colors"
                    >
                      <i className={`${cat.icon} mr-2`}></i>
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="flex-1">
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <p className="text-textSecondary">
                  Showing <span className="font-semibold text-textPrimary">{filteredProducts.length}</span> of {categoryProducts.length} products
                </p>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="lg:hidden px-4 py-2 bg-primary text-white rounded-lg font-semibold"
                  >
                    <i className="fa-solid fa-filter mr-2"></i>
                    Filters
                  </button>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-2 border border-borderPrimary rounded-lg focus:outline-none focus:border-primary"
                  >
                    {sortOptions.map(option => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="flex justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="text-center py-20">
                  <i className="fa-solid fa-exclamation-triangle text-6xl text-red-500 mb-4"></i>
                  <h3 className="text-2xl font-bold text-textPrimary mb-2">Error loading products</h3>
                  <p className="text-textSecondary mb-6">Please try again later</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="px-6 py-3 bg-primary text-white rounded-lg font-semibold"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Products Grid */}
              {!isLoading && !error && (
                filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts.map(product => (
                      <div
                        key={product.productId}
                        className="bg-bgSecondary rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group cursor-pointer"
                        onClick={() => navigate(`/product/${product.productId}`)}
                      >
                        <div className="relative overflow-hidden">
                          <WishlistButton productId={product.productName} className="absolute top-3 right-3 z-10" size="sm" />
                          <img
                            src={product.productImg}
                            alt={product.productName}
                            className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                            onError={(e) => {
                              e.target.src = '/placeholder.jpg';
                            }}
                          />
                          {product.badge && (
                            <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold text-white ${
                              product.badge === 'SALE' ? 'bg-primary' : 
                              product.badge === 'NEW' ? 'bg-accent' : 'bg-warning'
                            }`}>
                              {product.badge}
                            </div>
                          )}
                        </div>
                        <div className="p-6">
                          <div className="flex items-center gap-1 mb-2">
                            {[...Array(5)].map((_, i) => (
                              <i key={i} className={`fa-solid fa-star text-xs ${
                                i < Math.floor(product.rating || 4.5) ? 'text-warning' : 'text-borderSecondary'
                              }`} />
                            ))}
                            <span className="text-textMuted text-xs ml-1">({product.reviews || 0})</span>
                          </div>
                          <h3 className="text-textPrimary font-semibold mb-2 line-clamp-2">{product.productName}</h3>
                          <p className="text-textSecondary text-sm mb-3 line-clamp-2">{product.productDes || product.description}</p>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-primary font-bold text-lg">₹{product.sellingPrice?.toLocaleString()}</span>
                            {product.originalPrice && product.originalPrice > product.sellingPrice && (
                              <span className="text-textMuted line-through text-sm">₹{product.originalPrice?.toLocaleString()}</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                              {product.productCategory}
                            </span>
                            <span className="text-accent text-xs font-semibold">In Stock</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <i className="fa-solid fa-box-open text-6xl text-textMuted mb-4"></i>
                    <h3 className="text-2xl font-bold text-textPrimary mb-2">No products found</h3>
                    <p className="text-textSecondary mb-6">Try adjusting your filters</p>
                    <button onClick={clearFilters} className="px-6 py-3 bg-primary text-white rounded-lg font-semibold">
                      Clear Filters
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default CategoryProductsPage;