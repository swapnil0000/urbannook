import axios from "axios";
import { useEffect, useState } from "react";

/* ================= STATUS CONFIG ================= */

const STATUS_CONFIG = {
  in_stock: {
    label: "In Stock",
    abbr: "IS",
    class: "bg-green-100 text-green-700",
  },
  out_of_stock: {
    label: "Out of Stock",
    abbr: "OS",
    class: "bg-red-100 text-red-700",
  },
  discounted: {
    label: "Discounted",
    abbr: "OFF",
    class: "bg-purple-100 text-purple-700",
  },
  discontinued: {
    label: "Discontinued",
    abbr: "DC",
    class: "bg-yellow-100 text-yellow-800",
  },
};

/* ================= STATUS LOGIC ================= */

const getProductStatus = (product) => {
  const status = product.productStatus?.toLowerCase();

  if (status === "discontinued") {
    return STATUS_CONFIG.discontinued;
  }

  if (product.productQuantity === 0) {
    return STATUS_CONFIG.out_of_stock;
  }

  if (product.discountPercent > 0) {
    return STATUS_CONFIG.discounted;
  }

  return STATUS_CONFIG.in_stock;
};

/* ================= MAIN COMPONENT ================= */

const AdminProductDetails = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get(
          `${apiBaseUrl}/admin/total/products`,
          { withCredentials: true }
        );
        setProducts(res?.data?.data || []);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [apiBaseUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading products...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Product Management
        </h1>
        <p className="text-gray-500 mt-1">
          View and manage all listed products
        </p>
      </div>

      {/* STATUS LEGEND */}
      <StatusLegend />

      {/* PRODUCTS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </div>
  );
};

/* ================= PRODUCT CARD ================= */

const ProductCard = ({ product }) => {
  const status = getProductStatus(product);

  return (
    <div className="relative bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition">
      {/* STATUS BADGE */}
      <div
        className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${status.class}`}
        title={status.label}
      >
        {status.abbr}
      </div>

      <h2 className="text-lg font-semibold text-gray-800 pr-12">
        {product.productName}
      </h2>

      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
        {product.productDes}
      </p>

      <div className="mt-4 space-y-1 text-sm text-gray-600">
        <Info label="UI ID" value={product.uiProductId} />
        <Info label="Category" value={product.productSubCategory} />
        <Info label="Qty" value={product.productQuantity} />
        <Info label="Price" value={`₹ ${product.sellingPrice}`} />
      </div>

      {product.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {product.tags.map((tag, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-md"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-3 mt-5">
        <button className="flex-1 bg-black text-white py-2 rounded-xl text-sm">
          View
        </button>
        <button className="flex-1 border border-gray-300 py-2 rounded-xl text-sm">
          Edit
        </button>
      </div>
    </div>
  );
};

/* ================= STATUS LEGEND ================= */

const StatusLegend = () => (
  <div className="flex flex-wrap gap-3 mt-4">
    {Object.values(STATUS_CONFIG).map((s) => (
      <div
        key={s.abbr}
        className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${s.class}`}
      >
        <span className="font-bold">{s.abbr}</span>
        <span>{s.label}</span>
      </div>
    ))}
  </div>
);

/* ================= INFO ROW ================= */

const Info = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-gray-400">{label}</span>
    <span className="font-medium text-gray-700 truncate max-w-[150px]">
      {value || "-"}
    </span>
  </div>
);

export default AdminProductDetails;
