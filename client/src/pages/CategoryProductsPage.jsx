import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Footer from '../component/layout/Footer';
import { products, productCategories, colors, priceRanges, sortOptions } from '../data/products';

const CategoryProductsPage = () => {
  const { category } = useParams();
  const navigate = useNavigate();
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState(null);
  const [sortBy, setSortBy] = useState('featured');
  const [showFilters, setShowFilters] = useState(false);

  const categoryInfo = productCategories.find(cat => cat.id === category);
  const categoryProducts = products.filter(p => p.category === category);

  const filteredProducts = useMemo(() => {
    let filtered = categoryProducts;

    if (selectedColors.length > 0) {
      filtered = filtered.filter(p => 
        p.colors.some(color => selectedColors.includes(color))
      );
    }

    if (selectedPriceRange) {
      filtered = filtered.filter(p => 
        p.price >= selectedPriceRange.min && p.price <= selectedPriceRange.max
      );
    }

    switch (sortBy) {
      case 'price-low-high':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high-low':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        filtered.sort((a, b) => b.id - a.id);
        break;
      default:
        break;
    }

    return filtered;
  }, [categoryProducts, selectedColors, selectedPriceRange, sortBy]);

  const toggleColor = (colorId) => {
    setSelectedColors(prev =>
      prev.includes(colorId) ? prev.filter(c => c !== colorId) : [...prev, colorId]
    );
  };

  const clearFilters = () => {
    setSelectedColors([]);
    setSelectedPriceRange(null);
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
      <section className="py-16 px-8 bg-gradient-to-br from-bgSecondary via-accent/5 to-primary/10">
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

              {/* Color Filter */}
              <div className="mb-6">
                <h4 className="font-semibold text-textPrimary mb-3">Colors</h4>
                <div className="flex flex-wrap gap-3">
                  {colors.map(color => (
                    <button
                      key={color.id}
                      onClick={() => toggleColor(color.id)}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${
                        selectedColors.includes(color.id) ? 'border-primary scale-110' : 'border-borderPrimary'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
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
                      onClick={() => navigate(`/product/${cat.id}`)}
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

              {/* Products Grid */}
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map(product => (
                    <div
                      key={product.id}
                      className="bg-bgSecondary rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group cursor-pointer"
                      onClick={() => navigate(`/product/${product.category}/${product.slug}`)}
                    >
                      <div className="relative overflow-hidden">
                        <img
                          src={product.image}
                          alt={product.title}
                          className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
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
                              i < Math.floor(product.rating) ? 'text-warning' : 'text-borderSecondary'
                            }`} />
                          ))}
                          <span className="text-textMuted text-xs ml-1">({product.reviews})</span>
                        </div>
                        <h3 className="text-textPrimary font-semibold mb-2 line-clamp-2">{product.title}</h3>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-primary font-bold text-lg">₹{product.price}</span>
                          {product.originalPrice && (
                            <span className="text-textMuted line-through text-sm">₹{product.originalPrice}</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {product.colors.slice(0, 4).map(colorId => {
                            const color = colors.find(c => c.id === colorId);
                            return (
                              <div
                                key={colorId}
                                className="w-6 h-6 rounded-full border border-borderPrimary"
                                style={{ backgroundColor: color?.hex }}
                              />
                            );
                          })}
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
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CategoryProductsPage;