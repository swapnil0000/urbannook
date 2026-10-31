import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
<<<<<<< HEAD
import { useOrderHistoryQuery, useGetLoyaltySummaryQuery } from "../../store/api/userApi";
import { ComponentLoader } from "../../component/layout/LoadingSpinner";
=======
import { useGetOrderSummariesQuery } from "../../store/api/userApi";
>>>>>>> c57fe1da45e05a24ed3279151ad6b57ecee8f4ac
import { useUI } from "../../hooks/useRedux";
import { OrderSummaryCard } from "../../component/orders/OrderPage";

const ListSkeleton = () => (
  <div className="space-y-3 animate-pulse" role="status" aria-label="Loading your orders">
    {[0, 1, 2].map((i) => (
      <div key={i} className="uo-card h-40" />
    ))}
  </div>
);

// Per-order UnCash summary: balance before, used, earned (or pending until
// delivery), taken back / returned after a return, and the balance this order
// leaves you with. Only for orders placed while loyalty was on (they carry a
// `loyalty` snapshot) or that used/earned points.
const UnCashRow = ({ label, value, cls = "" }) => (
  <div className="flex justify-between items-center text-[10px] text-gray-500">
    <span>{label}</span>
    <span className={`font-bold ${cls}`}>{value}</span>
  </div>
);
const UNCASH_REVERSED = ["RETURNED", "REFUNDED", "CANCELLED", "RTO"];
const UnCashOrderCard = ({ order, loyaltyEnabled, earnPercent }) => {
  const l = order.loyalty;
  if (!l) return null;
  const used = Number(l.pointsRedeemed) || 0;
  const earned = l.isEarnCredited ? Number(l.pointsEarned) || 0 : 0;
  const takenBack = l.isEarnReversed ? Number(l.pointsReversed) || 0 : 0;
  const returned = l.isRedeemRefunded ? used : 0;
  const before = Number(l.balanceBeforeOrder) || 0;
  const cancelled = UNCASH_REVERSED.includes(order.resolutionStatus);
  const pending =
    !l.isEarnCredited && !cancelled && loyaltyEnabled && order.status === "PAID"
      ? Math.floor(((Number(order.amount) || 0) * earnPercent) / 100)
      : 0;
  if (!used && !earned && !pending && !takenBack && !before) return null;
  const after = before - used + earned - takenBack + returned;
  return (
    <div className="mt-2 px-5 py-4 bg-amber-50/60 rounded-2xl border border-amber-100 flex flex-col gap-2">
      <p className="text-[9px] font-bold uppercase tracking-widest text-[#a89068] flex items-center gap-1.5">
        <i className="fa-solid fa-coins" /> UnCash on this order
      </p>
      <UnCashRow label="Balance before this order" value={`${before} pts`} />
      {used > 0 && <UnCashRow label={`Used (₹${(Number(l.discountFromPoints) || 0).toLocaleString()} off)`} value={`−${used} pts`} cls="text-red-500" />}
      {earned > 0 && <UnCashRow label="Earned" value={`+${earned} pts`} cls="text-emerald-600" />}
      {pending > 0 && (
        <UnCashRow
          label={order.fulfillmentStatus === "DELIVERED" ? "Earning — being credited" : "You'll earn after delivery"}
          value={`~${pending} pts`}
          cls="text-amber-600"
        />
      )}
      {takenBack > 0 && <UnCashRow label="Taken back (order returned)" value={`−${takenBack} pts`} cls="text-red-500" />}
      {returned > 0 && <UnCashRow label="Used UnCash given back" value={`+${returned} pts`} cls="text-emerald-600" />}
      <div className="flex justify-between items-center pt-2 border-t border-amber-100 text-[10px] text-ink font-bold">
        <span>{pending > 0 ? "Balance after this order (before earning)" : "Balance after this order"}</span>
        <span>{after} pts</span>
      </div>
    </div>
  );
};

const MyOrdersPage = () => {
  // "UnCash earning" hint only while the loyalty feature is switched on (admin → Loyalty Points).
  const { data: loyaltyData } = useGetLoyaltySummaryQuery();
  const loyaltyEnabled = !!loyaltyData?.data?.isEnabled;
  const loyaltyEarnPercent = Number(loyaltyData?.data?.earnPercent) || 0;
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const authToken = useSelector((state) => state.auth?.token);
  const { openLoginModal, showNotification } = useUI();
  const loggedIn = isAuthenticated || !!authToken || !!localStorage.getItem("authToken");

  // Light rows only (no tracking history); each order's full picture loads on its own details page.
  const { data, isLoading, isError, refetch } = useGetOrderSummariesQuery(undefined, {
    skip: !loggedIn,
    refetchOnMountOrArgChange: true,
  });
  const orders = data?.data?.orders || [];

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!loggedIn) {
      showNotification("Please login to view your orders", "error");
      openLoginModal();
      navigate("/");
    }
  }, [loggedIn, navigate, openLoginModal, showNotification]);

  return (
    <main className="uo min-h-screen font-inter">
      <div className="max-w-3xl mx-auto px-3 sm:px-6 pt-5 sm:pt-8 pb-28 md:pb-16">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="gl-lbl text-brand mb-1">History</p>
            <h1 className="font-archivo font-extrabold text-3xl sm:text-4xl text-ink leading-tight">Your orders</h1>
          </div>
          {orders.length > 0 && <p className="text-sm text-muted pb-1">{orders.length} {orders.length === 1 ? "order" : "orders"}</p>}
        </div>

        {isLoading ? (
          <ListSkeleton />
        ) : isError ? (
          <div className="uo-card text-center" style={{ padding: 32 }}>
            <h2 className="font-archivo font-extrabold text-xl">We couldn&apos;t load your orders</h2>
            <p className="mt-2 text-sm text-muted">Please try again. Your orders are safe.</p>
            <button type="button" onClick={refetch} className="uo-btn uo-btn-primary mt-5">Try again</button>
          </div>
        ) : orders.length === 0 ? (
          <div className="uo-card text-center" style={{ padding: 40 }}>
            <h2 className="font-archivo font-extrabold text-xl">No orders yet</h2>
            <p className="mt-2 text-sm text-muted">When you place an order, you&apos;ll track it here.</p>
            <button type="button" onClick={() => navigate("/products")} className="uo-btn uo-btn-primary mt-5">Browse products</button>
          </div>
        ) : (
<<<<<<< HEAD
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
                          <span className="font-archivo text-ink text-base md:text-lg leading-none">Order #{order.orderId.slice(0, 8)}</span>
                          <i className="fa-regular fa-copy text-xs text-gray-300 group-hover:text-brand transition-colors"></i>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Amount</p>
                        <p className="text-ink font-archivo font-bold">₹{order.amount.toLocaleString()}</p>
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
                        {order.items.map((item, i) => {
                          const displayName = resolveVariantTitle(
                            item.productSnapshot?.productName || "Product",
                            item.productSnapshot?.variantTitleTemplate,
                            item.productSnapshot?.selectedVariant,
                          );
                          return (
                          <div key={i} className="flex gap-4 items-center bg-white p-3 rounded-xl border border-gray-100">
                            <div className="w-14 h-14 rounded-lg bg-gray-50 p-2 shrink-0 border border-gray-100">
                              <img src={item.productSnapshot?.productImg || "/placeholder.jpg"} alt={displayName} className="w-full h-full object-contain" />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <h4 className="text-ink font-medium text-xs md:text-sm truncate">{displayName}</h4>
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
                          );
                        })}
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
                        {order.loyalty?.pointsRedeemed > 0 && (
                          <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                            <span>UnCash used ({order.loyalty.pointsRedeemed} pts)</span>
                            <span className="text-emerald-600">-₹{order.loyalty.discountFromPoints.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-1">
                          <span className="text-[10px] text-ink font-bold uppercase tracking-widest">Grand Total</span>
                          <span className="text-xl font-archivo text-ink font-bold">₹{order.amount.toLocaleString()}</span>
                        </div>
                      </div>
                      <UnCashOrderCard order={order} loyaltyEnabled={loyaltyEnabled} earnPercent={loyaltyEarnPercent} />
                    </div>
                  )}
                </div>
              );
            })}
=======
          <div className="space-y-3">
            {orders.map((o) => (
              <OrderSummaryCard key={o.orderId} order={o} />
            ))}
>>>>>>> c57fe1da45e05a24ed3279151ad6b57ecee8f4ac
          </div>
        )}
      </div>
    </main>
  );
};

export default MyOrdersPage;
