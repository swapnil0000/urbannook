import axios from "axios";
import { useEffect, useState } from "react";
import {
  X,
  Tag,
  IndianRupee,
  Package,
  Info,
  Layers,
  Edit3,
  Save,
  Loader2,
  Image as ImageIcon,
  Hash,
  CheckCircle,
  AlertCircle
} from "lucide-react";

/* ================= STATUS CONFIG ================= */
const STATUS_CONFIG = {
  in_stock: { label: "In Stock", abbr: "IS", class: "bg-green-100 text-green-700" },
  out_of_stock: { label: "Out of Stock", abbr: "OS", class: "bg-red-100 text-red-700" },
  discounted: { label: "Discounted", abbr: "OFF", class: "bg-purple-100 text-purple-700" },
  discontinued: { label: "Discontinued", abbr: "DC", class: "bg-yellow-100 text-yellow-800" },
};

/* ================= HELPER FUNCTIONS ================= */
const getProductStatus = (product) => {
  const status = product.productStatus?.toLowerCase();
  if (status === "discontinued") return STATUS_CONFIG.discontinued;
  if (product.productQuantity === 0) return STATUS_CONFIG.out_of_stock;
  if (product.discountPercent > 0) return STATUS_CONFIG.discounted;
  return STATUS_CONFIG.in_stock;
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-IN", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

const AdminProductDetails = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  
  // Edit Mode State
  const [modalMode, setModalMode] = useState("view");
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Fetch All Products
  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/admin/total/products`, { withCredentials: true });
      setProducts(res?.data?.data || []);
    } catch (err) {
      console.error("Error fetching products", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [apiBaseUrl]);

  // Fetch Single Product & Populate Form
  const fetchProductDetails = async (productId) => {
    setModalLoading(true);
    try {
      const res = await axios.get(`${apiBaseUrl}/admin/view/inventory/${productId}`, { withCredentials: true });
      const data = Array.isArray(res?.data?.data) ? res?.data?.data[0] : res?.data?.data;
      setSelectedProduct(data);
      
      // Populate Form Data matches Mongoose Schema
      setFormData({
        productName: data.productName || "",
        productId: data.productId || "", // disabled
        uiProductId: data.uiProductId || "",
        productImg: data.productImg || "",
        productDes: data.productDes || "",
        productSubDes: data.productSubDes || "",
        sellingPrice: data.sellingPrice || 0,
        productQuantity: data.productQuantity || 0,
        productCategory: data.productCategory || "",
        productSubCategory: data.productSubCategory || "",
        productStatus: data.productStatus || "in_stock",
        tags: data.tags ? data.tags.join(",") : "", // Converting array to string for editing
        isPublished: data.isPublished || false,
      });
    } catch (error) {
      console.error("Error fetching details:", error);
    } finally {
      setModalLoading(false);
    }
  };

  const handleViewClick = (productId) => {
    setIsModalOpen(true);
    setModalMode("view");
    fetchProductDetails(productId);
  };

  const handleEditClick = (productId) => {
    setIsModalOpen(true);
    setModalMode("edit");
    fetchProductDetails(productId);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSaveChanges = async () => {
    if (!selectedProduct?.productId) return;
    
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        tags: typeof formData.tags === 'string' ? formData.tags.split(',').map(t => t.trim()) : formData.tags
      };

      await axios.post(
        `${apiBaseUrl}/admin/update/inventory/${selectedProduct.productId}`,
        payload, 
        { withCredentials: true }
      );

      alert("Product Updated Successfully!");
      setIsModalOpen(false);
      fetchProducts();
    } catch (error) {
      console.error("Error updating product:", error);
      alert(error.response?.data?.message || "Failed to update product.");
    } finally {
      setIsSaving(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
    setFormData({});
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500"><Package className="w-6 h-6 mr-2 animate-bounce" /> Loading products...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto relative">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2"><Package className="text-indigo-600" /> Product Management</h1>
        <p className="text-gray-500 mt-1 ml-9">View and manage all listed products</p>
      </div>

      <StatusLegend />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {products.map((product) => (
          <ProductCard
            key={product._id}
            product={product}
            onView={() => handleViewClick(product.productId)}
            onEdit={() => handleEditClick(product.productId)}
          />
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in duration-200 scrollbar-hide">
            
            <button onClick={closeModal} className="absolute top-4 right-4 p-2 bg-white/80 hover:bg-white rounded-full text-gray-600 hover:text-red-500 transition shadow-sm z-10">
              <X className="w-5 h-5" />
            </button>

            {modalLoading ? (
              <div className="flex flex-col items-center justify-center h-80 space-y-3">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                <p className="text-gray-500 font-medium">Fetching details...</p>
              </div>
            ) : selectedProduct ? (
              <div className="p-0">
                
                <div className="h-56 w-full bg-gray-50 relative flex items-center justify-center border-b border-gray-100">
                   {modalMode === 'view' ? (
                      selectedProduct.productImg ? (
                        <img src={selectedProduct.productImg} alt="Product" className="w-full h-full object-contain mix-blend-multiply p-6" />
                      ) : (
                        <div className="flex flex-col items-center text-gray-400"><ImageIcon className="w-12 h-12 mb-2 opacity-20" /> <span>No Image</span></div>
                      )
                   ) : (
                      <div className="w-full px-8">
                         <label className="block text-xs font-bold text-gray-500 mb-1">IMAGE URL / BASE64</label>
                         <textarea name="productImg" value={formData.productImg} onChange={handleInputChange} className="w-full h-32 p-3 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" placeholder="Paste image URL..." />
                      </div>
                   )}
                </div>

                <div className="p-6 md:p-8 space-y-6">
                  
                  <div>
                    {modalMode === 'view' ? (
                        <h2 className="text-2xl font-bold text-gray-900 leading-tight">{selectedProduct.productName}</h2>
                    ) : (
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 mb-1">PRODUCT NAME</label>
                            <input type="text" name="productName" value={formData.productName} onChange={handleInputChange} className="w-full text-xl font-bold text-gray-900 border-b-2 border-gray-200 focus:border-indigo-500 outline-none py-1" />
                        </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row gap-4 mt-4">
                       {modalMode === 'edit' ? (
                          <InputBox label="UI Product ID" name="uiProductId" value={formData.uiProductId} onChange={handleInputChange} icon={Tag} />
                       ) : (
                          <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-100 text-sm text-gray-500">
                            <Tag className="w-3 h-3" /> {selectedProduct.uiProductId}
                          </span>
                       )}
                       {modalMode === 'edit' ? (
                          <InputBox 
                             label="Product ID (Read Only)" 
                             name="productId" 
                             value={formData.productId} 
                             onChange={() => {}} // read only
                             icon={Hash} 
                             disabled={true}
                          />
                       ) : (
                          <span className="font-mono text-xs text-gray-400 flex items-center pt-1">{selectedProduct.productId}</span>
                       )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {modalMode === 'view' ? (
                        <>
                           <DetailBox label="Selling Price" value={`₹${selectedProduct.sellingPrice}`} icon={IndianRupee} color="text-green-600" bg="bg-green-50" />
                           <DetailBox label="Quantity" value={selectedProduct.productQuantity} icon={Package} color="text-blue-600" bg="bg-blue-50" />
                           <DetailBox label="Category" value={selectedProduct.productCategory} icon={Layers} color="text-purple-600" bg="bg-purple-50" />
                           <DetailBox label="Sub Category" value={selectedProduct.productSubCategory} icon={Tag} color="text-orange-600" bg="bg-orange-50" />
                        </>
                    ) : (
                        <>
                            <InputBox label="Price (₹)" name="sellingPrice" type="number" value={formData.sellingPrice} onChange={handleInputChange} icon={IndianRupee} />
                            <InputBox label="Quantity" name="productQuantity" type="number" value={formData.productQuantity} onChange={handleInputChange} icon={Package} />
                            <InputBox label="Category" name="productCategory" value={formData.productCategory} onChange={handleInputChange} icon={Layers} />
                            <InputBox label="Sub Category" name="productSubCategory" value={formData.productSubCategory} onChange={handleInputChange} icon={Tag} />
                        </>
                    )}
                  </div>

                  {modalMode === 'edit' && (
                     <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-300 shadow-sm">
                           <div className="p-2.5 rounded-lg bg-gray-50 text-gray-500"><AlertCircle size={20} /></div>
                           <div className="flex flex-col w-full">
                              <span className="text-[10px] text-gray-400 font-bold uppercase">Status</span>
                              <select name="productStatus" value={formData.productStatus} onChange={handleInputChange} className="text-sm font-bold text-gray-900 w-full outline-none bg-transparent cursor-pointer">
                                 <option value="in_stock">In Stock</option>
                                 <option value="out_of_stock">Out of Stock</option>
                                 <option value="discontinued">Discontinued</option>
                              </select>
                           </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-300 shadow-sm cursor-pointer" onClick={() => setFormData(p => ({...p, isPublished: !p.isPublished}))}>
                           <div className={`p-2.5 rounded-lg ${formData.isPublished ? 'bg-green-100 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                              <CheckCircle size={20} />
                           </div>
                           <div className="flex flex-col">
                              <span className="text-[10px] text-gray-400 font-bold uppercase">Published</span>
                              <span className={`text-sm font-bold ${formData.isPublished ? 'text-green-600' : 'text-gray-500'}`}>
                                 {formData.isPublished ? 'Live on Site' : 'Hidden'}
                              </span>
                           </div>
                        </div>
                     </div>
                  )}

                  <div className="space-y-4">
                    <div className={`p-4 rounded-xl border ${modalMode === 'edit' ? 'bg-white border-gray-300' : 'bg-gray-50 border-gray-100'}`}>
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
                        <Info className="w-4 h-4 text-indigo-500" /> Description
                      </h3>
                      {modalMode === 'view' ? (
                          <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{selectedProduct.productDes || "No description."}</p>
                      ) : (
                          <textarea name="productDes" value={formData.productDes} onChange={handleInputChange} rows="4" className="w-full text-sm text-gray-700 bg-transparent outline-none resize-none border-b border-gray-200 focus:border-indigo-500" placeholder="Description..." />
                      )}
                    </div>

                    {(modalMode === 'edit' || selectedProduct.productSubDes) && (
                       <div className="px-4">
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Sub Description</h3>
                          {modalMode === 'view' ? (
                             <p className="text-gray-600 text-sm italic border-l-2 border-indigo-200 pl-3">{selectedProduct.productSubDes}</p>
                          ) : (
                             <input type="text" name="productSubDes" value={formData.productSubDes} onChange={handleInputChange} className="w-full text-sm italic p-2 border border-gray-300 rounded-lg outline-none" placeholder="Sub-description..." />
                          )}
                       </div>
                    )}
                  </div>

                  {modalMode === 'view' && (
                     <div className="flex flex-col sm:flex-row justify-between text-xs text-gray-400 gap-4 pt-4 border-t border-gray-100">
                        <span>Created: {formatDate(selectedProduct.createdAt)}</span>
                        <span>Updated: {formatDate(selectedProduct.updatedAt)}</span>
                     </div>
                  )}
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                   <button onClick={closeModal} className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition" disabled={isSaving}>
                     {modalMode === 'view' ? 'Close' : 'Cancel'}
                   </button>
                   {modalMode === 'edit' && (
                       <button onClick={handleSaveChanges} disabled={isSaving} className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition shadow-lg disabled:opacity-50">
                         {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Changes</>}
                       </button>
                   )}
                </div>

              </div>
            ) : (<div className="p-12 text-center text-red-500">Error Loading Data</div>)}
          </div>
        </div>
      )}
    </div>
  );
};

/* ================= HELPERS & COMPONENTS ================= */

const ProductCard = ({ product, onView, onEdit }) => {
  const status = getProductStatus(product);
  return (
    <div className="relative bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      <div className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${status.class}`}>{status.abbr}</div>
      <h2 className="text-lg font-bold text-gray-800 pr-12 line-clamp-1">{product.productName}</h2>
      <p className="text-sm text-gray-500 mt-2 line-clamp-2 min-h-[40px]">{product.productDes}</p>
      <div className="mt-5 space-y-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
         <InfoRow label="Price" value={`₹ ${product.sellingPrice}`} isPrice />
         <InfoRow label="Qty" value={product.productQuantity} />
      </div>
      <div className="flex gap-3 mt-5">
        <button onClick={onView} className="flex-1 bg-black text-white py-2.5 rounded-xl text-sm font-medium hover:opacity-80 flex gap-2 justify-center"><Info className="w-4 h-4" /> View</button>
        <button onClick={onEdit} className="flex-1 border border-gray-300 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 flex gap-2 justify-center"><Edit3 className="w-4 h-4" /> Edit</button>
      </div>
    </div>
  );
};

const DetailBox = ({ label, value, icon: Icon, color, bg }) => (
  <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
    <div className={`p-2.5 rounded-lg ${bg} ${color}`}><Icon size={20} /></div>
    <div className="flex flex-col">
      <span className="text-[10px] text-gray-400 font-bold uppercase">{label}</span>
      <span className="text-sm font-bold text-gray-900 truncate">{value}</span>
    </div>
  </div>
);

// Updated InputBox with DISABLED support
const InputBox = ({ label, name, value, onChange, icon: Icon, type = "text", disabled = false }) => (
  <div className={`flex items-center gap-3 p-3 rounded-xl border shadow-sm transition ${disabled ? 'bg-gray-100 border-gray-200 opacity-70 cursor-not-allowed' : 'bg-white border-gray-300 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-500'}`}>
    <div className={`p-2.5 rounded-lg ${disabled ? 'text-gray-400 bg-gray-200' : 'bg-gray-50 text-gray-500'}`}><Icon size={20} /></div>
    <div className="flex flex-col w-full">
      <span className="text-[10px] text-gray-400 font-bold uppercase">{label}</span>
      <input 
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`text-sm font-bold w-full outline-none bg-transparent ${disabled ? 'text-gray-500 cursor-not-allowed' : 'text-gray-900'}`}
        placeholder={`Enter ${label}`}
      />
    </div>
  </div>
);

const InfoRow = ({ label, value, isPrice }) => (
  <div className="flex justify-between items-center">
    <span className="text-gray-400 text-xs uppercase font-medium">{label}</span>
    <span className={`font-semibold ${isPrice ? "text-gray-900" : "text-gray-700"}`}>{value || "-"}</span>
  </div>
);

const StatusLegend = () => (
    <div className="flex flex-wrap gap-3 mt-4">
      {Object.values(STATUS_CONFIG).map((s) => (
        <div key={s.abbr} className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${s.class}`}>
          <span className="font-bold">{s.abbr}</span><span>{s.label}</span>
        </div>
      ))}
    </div>
);

export default AdminProductDetails;