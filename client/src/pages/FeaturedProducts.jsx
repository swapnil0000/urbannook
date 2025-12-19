import React from "react";
import { theme2 } from "../theme";

const featuredProducts = [
  {
    id: 1,
    title: "Premium Leather Sofa",
    price: 24999,
    rating: 4.9,
    reviews: 156,
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop",
    badge: "Best Seller"
  },
  {
    id: 2,
    title: "Scandinavian Coffee Table",
    price: 8999,
    rating: 4.8,
    reviews: 203,
    image: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=400&h=400&fit=crop",
    badge: "Top Rated"
  },
  {
    id: 3,
    title: "Modern Bookshelf",
    price: 12999,
    rating: 4.9,
    reviews: 178,
    image: "https://images.unsplash.com/photo-1594620302200-9a762244a156?w=400&h=400&fit=crop",
    badge: "Editor's Pick"
  },
];

export default function FeaturedProducts() {
  return (
    <section style={{ padding: "80px 40px", backgroundColor: theme2.background }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <h2 style={{ color: theme2.primary, fontSize: "36px", fontWeight: "bold", marginBottom: "12px" }}>
            Featured Products
          </h2>
          <div style={{ width: "60px", height: "4px", backgroundColor: theme2.accentOrange, margin: "0 auto 16px", borderRadius: "2px" }}></div>
          <p style={{ color: theme2.text, fontSize: "18px", opacity: 0.8 }}>
            Our highest-rated products loved by customers
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "32px" }}>
          {featuredProducts.map((product) => (
            <div
              key={product.id}
              style={{
                backgroundColor: theme2.background,
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                border: `1px solid ${theme2.secondary}`,
                transition: "transform 0.3s ease, box-shadow 0.3s ease",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px)";
                e.currentTarget.style.boxShadow = "0 12px 30px rgba(0,171,228,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)";
              }}
            >
              {/* Badge */}
              <div style={{ position: "absolute", top: "16px", left: "16px", backgroundColor: theme2.accentOrange, color: "#FFF", padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", zIndex: 10 }}>
                {product.badge}
              </div>

              {/* Image */}
              <div style={{ position: "relative", overflow: "hidden", height: "300px" }}>
                <img
                  src={product.image}
                  alt={product.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s ease" }}
                  onMouseEnter={(e) => e.target.style.transform = "scale(1.05)"}
                  onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
                />
              </div>

              {/* Content */}
              <div style={{ padding: "24px" }}>
                <h3 style={{ color: theme2.text, fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>
                  {product.title}
                </h3>

                {/* Rating */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", gap: "2px" }}>
                    {[...Array(5)].map((_, i) => (
                      <span key={i} style={{ color: i < Math.floor(product.rating) ? theme2.accentOrange : "#E0E0E0", fontSize: "16px" }}>
                        ★
                      </span>
                    ))}
                  </div>
                  <span style={{ color: theme2.text, fontSize: "14px", fontWeight: "600" }}>
                    {product.rating}
                  </span>
                  <span style={{ color: theme2.text, fontSize: "14px", opacity: 0.6 }}>
                    ({product.reviews} reviews)
                  </span>
                </div>

                {/* Price */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={{ color: theme2.primary, fontSize: "24px", fontWeight: "bold", margin: 0 }}>
                    ₹{product.price.toLocaleString()}
                  </p>
                  <button
                    onMouseEnter={(e) => e.target.style.backgroundColor = theme2.accentOrange}
                    onMouseLeave={(e) => e.target.style.backgroundColor = theme2.accent}
                    style={{
                      backgroundColor: theme2.accent,
                      color: "#FFF",
                      border: "none",
                      padding: "10px 20px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "14px",
                      transition: "all 0.3s ease",
                    }}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
