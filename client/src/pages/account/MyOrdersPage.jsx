import { useEffect, lazy, Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useSelector } from "react-redux";
import { useOrderHistoryQuery } from "../../store/api/userApi";
import { ComponentLoader } from "../../component/layout/LoadingSpinner";
import { useUI } from "../../hooks/useRedux";
import { getApiUrl } from "../../config/appUrls";

// Lazy load heavy components
const OrderTracker = lazy(() => import("../../component/OrderTracker"));

const MyOrdersPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const authToken = useSelector((state) => state.auth?.token);
  const { openLoginModal, showNotification } = useUI();
  const { data: orderResponse, isLoading, error } = useOrderHistoryQuery(user?.email);
  const [generatingOrderId, setGeneratingOrderId] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [activeSubSection, setActiveSubSection] = useState(null); // 'tracking' or 'shipping'

  const orders = orderResponse?.data?.orders || [];

  useEffect(() => {
    window.scrollTo(0, 0);

    const hasToken = !!localStorage.getItem("authToken");
    const isLoggedIn = isAuthenticated || hasToken;

    if (!isLoggedIn) {
      showNotification("Please login to view your orders", "error");
      openLoginModal();
      navigate("/");
    }
  }, [isAuthenticated, navigate, openLoginModal, showNotification]);
  useEffect(() => {
    setActiveSubSection(null);
  }, [expandedOrderId]);

  const toggleOrder = (orderId) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  const toggleSubSection = (section) => {
    setActiveSubSection(prev => prev === section ? null : section);
  };

  const copyToClipboard = (text, message = "Order ID copied to clipboard") => {
    navigator.clipboard.writeText(text);
    showNotification(message, "info");
  };

  const copyAWB = (awb) => {
    navigator.clipboard.writeText(awb);
    showNotification("AWB number copied", "info");
  };

  const handleGenerateInvoice = async (orderId, razorpayOrderId) => {
    try {
      setGeneratingOrderId(orderId);
      
      let token = authToken || localStorage.getItem('authToken');

      const response = await fetch(
        `${getApiUrl()}/user/order/generate-invoice`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          body: JSON.stringify({ razorpayOrderId }),
        }
      );

      const responseData = await response.json();

      if (!response.ok || !responseData.success) {
        throw new Error(responseData.message || 'Failed to generate invoice');
      }

      const s3Url = responseData.data.url;
      window.open(s3Url, '_blank');

      showNotification("Invoice downloaded successfully", "success");
    } catch (error) {
      console.error("Invoice generation error:", error);
      const errorMsg = error?.message || "Failed to generate invoice";
      showNotification(errorMsg, "error");
    } finally {
      setGeneratingOrderId(null);
    }
  };

  const getStatusConfig = (status) => {
    const s = status?.toUpperCase();
    switch (s) {
      case "DELIVERED":
        return {
          text: "text-emerald-600",
          bg: "bg-emerald-100",
          border: "border-emerald-200",
          icon: "fa-check-circle",
          label: "Delivered",
        };
      case "SHIPPED":
        return {
          text: "text-blue-600",
          bg: "bg-blue-100",
          border: "border-blue-200",
          icon: "fa-truck-fast",
          label: "In Transit",
        };
      case "CREATED":
      case "PROCESSING":
        return {
          text: "text-brand",
          bg: "bg-brand/10",
          border: "border-brand/20",
          icon: "fa-box-open",
          label: "Processing",
        };
      case "CANCELLED":
        return {
          text: "text-red-600",
          bg: "bg-red-100",
          border: "border-red-200",
          icon: "fa-ban",
          label: "Cancelled",
        };
      default:
        return {
          text: "text-gray-600",
          bg: "bg-gray-100",
          border: "border-gray-200",
          icon: "fa-circle-info",
          label: status,
        };
    }
  };

  if (isLoading) {
    return (
      <div className="bg-ink min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-ink min-h-screen flex items-center justify-center text-white">
        <div className="text-center">
          <h2 className="text-2xl mb-4 font-serif">Failed to load orders</h2>
          <p className="text-gray-400 text-sm">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-ink min-h-screen font-sans text-gray-200 selection:bg-brand selection:text-white">
      {/* --- AMBIENT BACKGROUND --- */}
      <div className="fixed top-0 left-0 w-full h-[600px] bg-gradient-to-b from-ink to-ink pointer-events-none opacity-60"></div>
      <div className="fixed -bottom-40 -left-40 w-[600px] h-[600px] bg-brand rounded-full blur-[200px] opacity-[0.05] pointer-events-none"></div>

      <main className="max-w-5xl mx-auto pt-28 pb-20 px-4 md:px-8 relative z-10">
        {/* --- HEADER --- */}
        <div className="mb-10 md:mb-16 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="h-[1px] w-8 bg-brand"></span>
              <span className="text-brand font-bold tracking-[0.2em] uppercase text-[10px]">
                History
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white leading-tight">
              Order <span className="italic text-brand">Archive.</span>
            </h1>
          </div>

          <div className="px-5 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm flex items-center gap-3">
            <span className="text-gray-400 text-xs uppercase tracking-wider">
              Total Orders
            </span>
            <span className="text-brand font-bold font-serif text-xl">
              {orderResponse?.data?.totalOrders || orders.length}
            </span>
          </div>
        </div>

        {/* --- ORDERS LIST --- */}
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-surface rounded-[3rem] border border-white/5 shadow-2xl">
            <div className="w-24 h-24 bg-brand/10 rounded-full flex items-center justify-center mb-6 border border-brand/20">
              <i className="fa-solid fa-box-open text-brand text-3xl"></i>
            </div>
            <h3 className="text-2xl font-serif text-ink mb-2">Your collection is empty.</h3>
            <button
              onClick={() => navigate("/products")}
              className="px-8 py-3 bg-brand text-white rounded-full font-bold uppercase tracking-widest text-[10px] hover:bg-brandHi hover:scale-105 transition-all duration-300 shadow-lg"
            >
              Browse Collection
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusConfig = getStatusConfig(order.status);
              const dateObj = new Date(order.createdAt);
              const isExpanded = expandedOrderId === order.orderId;

              return (
                <div
                  key={order.orderId}
                  className="bg-surface rounded-[24px] overflow-hidden shadow-lg transition-all duration-300"
                >
                  {/* --- CARD HEADER --- */}
                  <div 
                    className={`p-5 md:p-6 flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-100 transition-colors ${isExpanded ? 'bg-gray-50 border-b border-gray-200' : ''}`}
                    onClick={() => toggleOrder(order.orderId)}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center ${statusConfig.bg} border ${statusConfig.border} shrink-0`}>
                        <i className={`fa-solid ${statusConfig.icon} ${statusConfig.text}`}></i>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${statusConfig.text}`}>
                            {statusConfig.label}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-gray-400 hidden xs:block"></span>
                          <span className="text-[10px] md:text-xs text-gray-500">
                            {dateObj.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          {order.paymentMethod === "COD" ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-[9px] font-bold text-amber-700 uppercase tracking-wide">
                              COD
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[9px] font-bold text-emerald-700 uppercase tracking-wide">
                              <i className="fa-solid fa-circle-check text-[8px]"></i> Paid
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); copyToClipboard(order.orderId); }}
                          className="flex items-center gap-1.5 group"
                        >
                          <span className="font-serif text-ink text-base md:text-lg leading-none">Order #{order.orderId.slice(0, 8)}</span>
                          <i className="fa-regular fa-copy text-xs text-gray-300 group-hover:text-brand transition-colors"></i>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Amount</p>
                        <p className="text-ink font-serif font-bold">₹{order.amount.toLocaleString()}</p>
                      </div>
                      <div className={`w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-ink border-ink' : 'bg-white'}`}>
                        <i className={`fa-solid fa-chevron-down text-xs ${isExpanded ? 'text-white' : 'text-gray-400'}`}></i>
                      </div>
                    </div>
                  </div>

                  {/* --- ORDER TRACKER (always visible) --- */}
                  <div className="px-5 md:px-6 border-b border-gray-100">
                    <Suspense fallback={<ComponentLoader />}>
                      <OrderTracker status={order.status} trackingNumber={order.trackingInfo?.trackingNumber} />
                    </Suspense>
                  </div>

                  {isExpanded && (
                    <div className="p-5 md:p-6 animate-in fade-in duration-300">
                      <div className="mb-6 pb-6 border-b border-gray-200">

                        {/* Tracking — flat, always visible */}
                        {order?.status !== 'CANCELLED' && (
                          <div className="mb-4 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-3">
                            {order?.trackingInfo?.trackingNumber ? (
                              <>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase">AWB Number</span>
                                    <div
                                      onClick={(e) => { e.stopPropagation(); copyAWB(order.trackingInfo.trackingNumber); }}
                                      className="flex items-center gap-2 mt-0.5 cursor-pointer group"
                                    >
                                      <span className="font-mono font-bold text-sm text-ink group-hover:text-brand">{order.trackingInfo.trackingNumber}</span>
                                      <i className="fa-regular fa-copy text-gray-300 text-xs group-hover:text-brand"></i>
                                    </div>
                                  </div>
                                  <a
                                    href={`https://panel.shipmozo.com/track-order?awb=${order.trackingInfo.trackingNumber}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="px-4 py-2 bg-brand text-white rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] flex items-center gap-2 shrink-0"
                                  >
                                    <i className="fa-solid fa-location-arrow text-xs"></i> Track Order
                                  </a>
                                </div>
                              </>
                            ) : (
                              <p className="text-[10px] text-gray-400 italic">Tracking details will be available once your order is dispatched.</p>
                            )}
                          </div>
                        )}

                        <div className="mt-2 space-y-3">
                            <div className="flex flex-col">
                                <div 
                                    className={`p-4 flex items-center justify-between cursor-pointer bg-white border border-gray-200 shadow-sm transition-all ${activeSubSection === 'shipping' ? 'rounded-t-2xl border-b-0' : 'rounded-2xl'}`}
                                    onClick={() => toggleSubSection('shipping')}
                                >
                                    <div className="flex items-center gap-2">
                                        <i className="fa-solid fa-location-dot text-brand text-xs"></i>
                                        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand">Shipping & Contact</span>
                                    </div>
                                    <i className={`fa-solid fa-chevron-down text-[10px] text-gray-400 transition-transform duration-300 ${activeSubSection === 'shipping' ? 'rotate-180' : ''}`}></i>
                                </div>
                                {activeSubSection === 'shipping' && (
                                    <div className="px-5 pb-5 bg-white rounded-b-2xl border border-t-0 border-gray-200 shadow-sm animate-in fade-in duration-300">
                                        <div className="pt-3">
                                            <p className="text-ink text-sm font-bold mb-1">{order.deliveryAddress?.fullName}</p>
                                            <div className="text-gray-600 text-xs leading-relaxed space-y-1">
                                                <p>{order.deliveryAddress?.flatOrFloorNumber && <span>{order.deliveryAddress.flatOrFloorNumber}, </span>}{order.deliveryAddress?.addressLine || order.deliveryAddress?.formattedAddress}</p>
                                                <p className="font-semibold text-ink">{order.deliveryAddress?.city}, {order.deliveryAddress?.state} - {order.deliveryAddress?.pinCode}</p>
                                                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                                                    <div className="flex flex-col"><span className="text-[8px] font-bold text-gray-400 uppercase">Primary</span><span className="text-ink font-medium text-sm">{order.senderMobile || 'N/A'}</span></div>
                                                    <div className="flex flex-col"><span className="text-[8px] font-bold text-gray-400 uppercase">Secondary</span><span className="text-ink font-medium text-sm">{order.receiverMobile || 'N/A'}</span></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                      </div>

                      <div className="grid gap-3 mt-6">
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink mb-1 px-1">Purchased Artifacts</h4>
                        {order.items.map((item, i) => (
                          <div key={i} className="flex gap-4 items-center bg-white p-3 rounded-xl border border-gray-100">
                            <div className="w-14 h-14 rounded-lg bg-gray-50 p-2 shrink-0 border border-gray-100">
                              <img src={item.productSnapshot?.productImg || "/placeholder.jpg"} alt={item.productSnapshot?.productName} className="w-full h-full object-contain" />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <h4 className="text-ink font-medium text-xs md:text-sm truncate">{item.productSnapshot?.productName || "Product"}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                <div className="px-2 py-0.5 rounded bg-gray-50 border border-gray-100 text-[9px] text-gray-500 font-bold">Qty: {item.quantity}</div>
                                {item.productSnapshot?.selectedVariant && item.productSnapshot.selectedVariant !== 'N/A' && (
                                  <div className="px-2 py-0.5 rounded bg-gray-50 border border-gray-100 text-[9px] text-brand font-bold">
                                    Variant: {item.productSnapshot.selectedVariant}
                                  </div>
                                )}
                                </div>                              </div>
                              <div className="text-right">
                                <p className="text-ink font-mono font-bold text-sm">₹{((item?.productSnapshot?.priceAtPurchase || 0) * (item.quantity || 1)).toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Footer Total */}
                      {order.paymentMethod === "COD" && (
                        <div className="mt-6 px-4 py-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5">
                          {/* <i className="fa-solid fa-hand-holding-dollar text-amber-500 text-xs mt-0.5 shrink-0"></i> */}
                          <div>
                            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">Cash on Delivery</p>
                            <p className="text-[10px] text-amber-700 mt-0.5 leading-relaxed">
                              {order.codDetails?.partialAmountPaid > 0
                                ? `₹${order.codDetails.partialAmountPaid.toLocaleString()} paid in advance · ₹${order.codDetails.remainingAmount.toLocaleString()} to be paid on delivery`
                                : "Payment to be collected at the time of delivery."}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className={`${order.paymentMethod === "COD" ? "mt-2" : "mt-6"} px-5 py-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-2.5`}>
                        <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                          <span>Shipping</span><span>₹{(order.items?.[0]?.productSnapshot?.shipping || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                          <span>Discount</span><span className="text-brand">-₹{order.coupon?.discountAmount?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-1">
                          <span className="text-[10px] text-ink font-bold uppercase tracking-widest">Grand Total</span>
                          <span className="text-xl font-serif text-ink font-bold">₹{order.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyOrdersPage;
