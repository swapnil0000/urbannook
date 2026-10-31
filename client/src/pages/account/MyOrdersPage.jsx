import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useGetOrderSummariesQuery } from "../../store/api/userApi";
import { useUI } from "../../hooks/useRedux";
import { OrderSummaryCard } from "../../component/orders/OrderPage";

const ListSkeleton = () => (
  <div className="space-y-3 animate-pulse" role="status" aria-label="Loading your orders">
    {[0, 1, 2].map((i) => (
      <div key={i} className="uo-card h-40" />
    ))}
  </div>
);

const MyOrdersPage = () => {
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
          <div className="space-y-3">
            {orders.map((o) => (
              <OrderSummaryCard key={o.orderId} order={o} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default MyOrdersPage;
