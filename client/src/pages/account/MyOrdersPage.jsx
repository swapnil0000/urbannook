import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useGetOrderSummariesQuery } from "../../store/api/userApi";
import { useUI } from "../../hooks/useRedux";
import { OrderSummaryCard } from "../../component/orders/OrderPage";
import { ACCOUNT_ORDERS as C } from "../../content/homeRedesign";

const ListSkeleton = () => (
  <div className="rd-ord-list animate-pulse" role="status" aria-label={C.loadingLabel}>
    {[0, 1, 2].map((i) => <div key={i} className="rd-ord-skel" />)}
  </div>
);

const Notice = ({ title, body, action, onAction }) => (
  <div className="rd-ord-notice">
    <h2 className="font-archivo">{title}</h2>
    <p className="font-inter text-muted">{body}</p>
    <button type="button" onClick={onAction} className="rd-acct-btn rd-acct-btn--solid font-inter">{action}</button>
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
    <main className="uo uo-rd min-h-screen font-inter">
      <div className="rd-acct rd-ord-page">
        <header className="rd-acct-head rd-ord-head">
          <div>
            <p className="rd-eyebrow font-mono uppercase text-muted">{C.eyebrow}</p>
            <h1 className="rd-h2 font-archivo text-ink">{C.heading}</h1>
            <p className="rd-sub font-inter text-muted">{C.sub}</p>
          </div>
          {orders.length > 0 && (
            <p className="rd-count font-mono uppercase text-muted">{(orders.length === 1 ? C.count.one : C.count.many).replace("{n}", String(orders.length).padStart(2, "0"))}</p>
          )}
        </header>

        {isLoading ? (
          <ListSkeleton />
        ) : isError ? (
          <Notice title={C.errorTitle} body={C.errorBody} action={C.retry} onAction={refetch} />
        ) : orders.length === 0 ? (
          <Notice title={C.emptyTitle} body={C.emptyBody} action={C.browse} onAction={() => navigate("/products")} />
        ) : (
          <div className="rd-ord-list">
            {orders.map((o) => <OrderSummaryCard key={o.orderId} order={o} />)}
          </div>
        )}
      </div>
    </main>
  );
};

export default MyOrdersPage;
