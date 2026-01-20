export const productCategories = [
  {
    id: 'lighting',
    name: 'Lighting',
    icon: 'fa-solid fa-lightbulb',
    description: '3D printed lamps and lighting solutions'
  },
  {
    id: 'keychains',
    name: 'Keychains',
    icon: 'fa-solid fa-key',
    description: 'Stylish and functional keychains for everyday use'
  },
  {
    id: 'posters',
    name: 'Posters',
    icon: 'fa-solid fa-image',
    description: 'Beautiful wall art and decorative posters'
  },
  {
    id: 'desk-accessories',
    name: 'Desk Accessories',
    icon: 'fa-solid fa-desktop',
    description: 'Organize your workspace with style'
  },
  {
    id: 'car-accessories',
    name: 'Car Accessories',
    icon: 'fa-solid fa-car',
    description: 'Aesthetic accessories for your vehicle'
  },
  {
    id: 'home-decor',
    name: 'Home Decor',
    icon: 'fa-solid fa-home',
    description: 'Beautiful items to enhance your living space'
  }
];

export const colors = [
  { id: 'black', name: 'Black', hex: '#000000' },
  { id: 'white', name: 'White', hex: '#FFFFFF' },
  { id: 'red', name: 'Red', hex: '#FF6B6B' },
  { id: 'blue', name: 'Blue', hex: '#4ECDC4' },
  { id: 'green', name: 'Green', hex: '#00B894' },
  { id: 'yellow', name: 'Yellow', hex: '#FDCB6E' },
  { id: 'purple', name: 'Purple', hex: '#A29BFE' },
  { id: 'orange', name: 'Orange', hex: '#E17055' }
];

export const products = [
  // Featured Product - The Voronoi Glow
  {
    id: 1,
    title: 'The Voronoi Glow',
    slug: 'voronoi-glow',
    category: 'lighting',
    price: 1500,
    originalPrice: 3299,
    colors: ['black', 'white'],
    image: '/assets/featuredproduct.png',
    images: [
      '/assets/featuredproduct.png'
    ],
    badge: 'BESTSELLER',
    rating: 4.9,
    reviews: 120,
    description: 'Inspired by natural cellular structures. This biodegradable PLA lamp casts a warm, intricate web of shadows, transforming any room into a cozy sanctuary.',
    features: ['3D Printed Design', 'Biodegradable PLA Material', 'Warm LED Lighting', 'Unique Shadow Patterns'],
    inStock: true,
    tags: ['3d-printed', 'lamp', 'lighting', 'voronoi', 'eco-friendly']
  },
  // Keychains
  {
    id: 2,
    title: 'Minimalist Metal Keychain',
    slug: 'minimalist-metal-keychain',
    category: 'keychains',
    price: 199,
    originalPrice: 299,
    colors: ['black', 'white', 'red'],
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop'
    ],
    badge: 'BESTSELLER',
    rating: 4.8,
    reviews: 124,
    description: 'Sleek and durable metal keychain with minimalist design. Perfect for everyday use and makes a great gift.',
    features: ['Durable metal construction', 'Minimalist design', 'Lightweight', 'Gift-ready packaging'],
    inStock: true,
    tags: ['metal', 'minimalist', 'durable', 'gift']
  },
  {
    id: 3,
    title: 'Wooden Aesthetic Keychain',
    slug: 'wooden-aesthetic-keychain',
    category: 'keychains',
    price: 249,
    colors: ['black', 'white'],
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop'
    ],
    rating: 4.7,
    reviews: 89,
    description: 'Handcrafted wooden keychain with natural finish. Eco-friendly and stylish accessory for your keys.',
    features: ['Handcrafted wood', 'Natural finish', 'Eco-friendly', 'Unique grain patterns'],
    inStock: true,
    tags: ['wood', 'eco-friendly', 'handcrafted', 'natural']
  },
  {
    id: 4,
    title: 'Acrylic Design Keychain',
    slug: 'acrylic-design-keychain',
    category: 'keychains',
    price: 179,
    colors: ['red', 'blue', 'green', 'purple'],
    image: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=400&h=400&fit=crop'
    ],
    badge: 'NEW',
    rating: 4.9,
    reviews: 67,
    description: 'Modern acrylic keychain with unique design patterns. Lightweight and colorful addition to your keyring.',
    features: ['Acrylic material', 'Colorful designs', 'Lightweight', 'Modern patterns'],
    inStock: true,
    tags: ['acrylic', 'colorful', 'modern', 'lightweight']
  },
  {
    id: 5,
    title: 'Leather Circle Keychain',
    slug: 'leather-circle-keychain',
    category: 'keychains',
    price: 299,
    colors: ['black', 'white', 'red'],
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop'
    ],
    rating: 4.6,
    reviews: 45,
    description: 'Premium leather keychain with circular design. Elegant and durable for daily use.',
    features: ['Premium leather', 'Circular design', 'Elegant finish', 'Durable construction'],
    inStock: true,
    tags: ['leather', 'premium', 'circular', 'elegant']
  },

  // Posters
  {
    id: 6,
    title: 'Abstract Art Poster Set',
    slug: 'abstract-art-poster-set',
    category: 'posters',
    price: 599,
    originalPrice: 799,
    colors: ['black', 'white'],
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=400&h=400&fit=crop'
    ],
    badge: 'SALE',
    rating: 4.6,
    reviews: 156,
    description: 'Set of 3 abstract art posters with premium quality prints. Perfect for modern home and office decor.',
    features: ['Set of 3 posters', 'Premium quality prints', 'Modern design', 'Ready to frame'],
    inStock: true,
    tags: ['abstract', 'art', 'set', 'modern']
  },
  {
    id: 7,
    title: 'Minimalist Typography',
    slug: 'minimalist-typography',
    category: 'posters',
    price: 399,
    colors: ['black', 'white'],
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop'
    ],
    rating: 4.8,
    reviews: 203,
    description: 'Clean typography poster with inspirational quotes. Minimalist design that complements any interior.',
    features: ['Typography design', 'Inspirational quotes', 'Minimalist style', 'High-quality print'],
    inStock: true,
    tags: ['typography', 'quotes', 'minimalist', 'inspirational']
  },

  // Desk Accessories
  {
    id: 8,
    title: 'Bamboo Pen Stand',
    slug: 'bamboo-pen-stand',
    category: 'desk-accessories',
    price: 349,
    colors: ['white', 'black'],
    image: 'https://images.unsplash.com/photo-1586717799252-bd134ad00e26?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1586717799252-bd134ad00e26?w=400&h=400&fit=crop'
    ],
    rating: 4.5,
    reviews: 78,
    description: 'Sustainable bamboo pen stand with multiple compartments. Eco-friendly desk organization solution.',
    features: ['Bamboo material', 'Multiple compartments', 'Eco-friendly', 'Sustainable design'],
    inStock: true,
    tags: ['bamboo', 'eco-friendly', 'organizer', 'sustainable']
  },
  {
    id: 9,
    title: 'Desk Organizer Set',
    slug: 'desk-organizer-set',
    category: 'desk-accessories',
    price: 799,
    originalPrice: 999,
    colors: ['black', 'white', 'blue'],
    image: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=400&h=400&fit=crop'
    ],
    badge: 'POPULAR',
    rating: 4.9,
    reviews: 234,
    description: 'Complete desk organizer set with multiple compartments. Keep your workspace tidy and productive.',
    features: ['Complete set', 'Multiple compartments', 'Modular design', 'Premium materials'],
    inStock: true,
    tags: ['organizer', 'set', 'modular', 'premium']
  },

  // Car Accessories
  {
    id: 10,
    title: 'Car Air Freshener',
    slug: 'car-air-freshener',
    category: 'car-accessories',
    price: 199,
    colors: ['black', 'white', 'red', 'blue'],
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop'
    ],
    rating: 4.4,
    reviews: 92,
    description: 'Stylish car air freshener with long-lasting fragrance. Perfect for keeping your car fresh.',
    features: ['Long-lasting fragrance', 'Stylish design', 'Easy installation', 'Multiple scents'],
    inStock: true,
    tags: ['air-freshener', 'car', 'fragrance', 'stylish']
  },

  // Home Decor
  {
    id: 11,
    title: 'Decorative Plant Pot',
    slug: 'decorative-plant-pot',
    category: 'home-decor',
    price: 449,
    colors: ['white', 'black', 'green'],
    image: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=400&h=400&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=400&h=400&fit=crop'
    ],
    rating: 4.7,
    reviews: 118,
    description: 'Beautiful decorative plant pot with modern design. Perfect for indoor plants and home decoration.',
    features: ['Modern design', 'Drainage holes', 'Durable material', 'Multiple sizes'],
    inStock: true,
    tags: ['plant-pot', 'decorative', 'modern', 'indoor']
  }
];

export const priceRanges = [
  { id: 'under-200', label: 'Under ₹200', min: 0, max: 200 },
  { id: '200-500', label: '₹200 - ₹500', min: 200, max: 500 },
  { id: '500-1000', label: '₹500 - ₹1000', min: 500, max: 1000 },
  { id: 'above-1000', label: 'Above ₹1000', min: 1000, max: Infinity }
];

export const sortOptions = [
  { id: 'featured', label: 'Featured' },
  { id: 'price-low-high', label: 'Price: Low to High' },
  { id: 'price-high-low', label: 'Price: High to Low' },
  { id: 'rating', label: 'Customer Rating' },
  { id: 'newest', label: 'Newest First' }
];