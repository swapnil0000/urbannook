import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useGetOrderViewQuery, useGetOrderRecommendationsQuery, useGetInvoiceLinkMutation } from "../../store/api/userApi";
import { useUI } from "../../hooks/useRedux";
import { resolveVariantTitle } from "../../utils/variantTitle";
import WishlistButton from "../WishlistButton";

/* ──────────────────────────────────────────────────────────────────────────
   Customer order pages, in one file: confirmation hero, tracking, payment,
   items, price details, address/contact, actions, recommendations, the archive
   row and the page itself. Look: the `.uo-*` classes in index.css. Data: the
   server's order view (server/src/services/orderView.service.js) — nothing here
   calculates money.
   ────────────────────────────────────────────────────────────────────────── */

// ── formatting ──────────────────────────────────────────────────────────────
const IST = "Asia/Kolkata";
const formatINR = (n) => {
  const v = Number(n);
  return `₹${(Number.isFinite(v) ? v : 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const fmt = (iso, opts) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleString("en-IN", { timeZone: IST, ...opts }).replace(/\b(am|pm)\b/, (m) => m.toUpperCase()) : "";
};
const formatISTDate = (iso) => fmt(iso, { day: "numeric", month: "short", year: "numeric" });
const formatISTShort = (iso) => fmt(iso, { day: "numeric", month: "short" });
const formatISTDateTime = (iso) => fmt(iso, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
const formatISTStep = (iso) => fmt(iso, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
const shortRef = (id) => (id ? String(id).slice(-8).toUpperCase() : "");

const BANNER = { success: "uo-banner-green", info: "uo-banner-ink", warning: "uo-banner-amber", danger: "uo-banner-red" };
const PAYMENT_TONE = { PAID: "success", ADVANCE_PAID: "success", COD_DUE: "info", PENDING: "warning", FAILED: "danger", CANCELLED: "danger", REFUND_PROCESSING: "warning", REFUNDED: "info", PARTIALLY_REFUNDED: "info" };

// ── small pieces ─────────────────────────────────────────────────────────────
const CopyButton = ({ value, label = "Copy" }) => {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(value));
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <button type="button" onClick={copy} aria-label={done ? "Copied" : label} className="inline-flex items-center justify-center min-w-[28px] min-h-[28px] text-muted hover:text-brand">
      <i className={`fa-regular ${done ? "fa-circle-check uo-green" : "fa-copy"} text-xs`} aria-hidden="true" />
      <span className="sr-only" aria-live="polite">{done ? "Copied" : ""}</span>
    </button>
  );
};

const Card = ({ id, title, icon, aside, children, className = "", labelId }) => (
  <section id={id} aria-labelledby={labelId} className={`uo-card ${className}`}>
    {title && (
      <div className="flex items-center justify-between gap-3">
        <h2 id={labelId} className="uo-h"><i className={`fa-solid ${icon}`} aria-hidden="true" />{title}</h2>
        {aside}
      </div>
    )}
    {children}
  </section>
);

// ── hero ─────────────────────────────────────────────────────────────────────
const HERO_TITLE = {
  CONFIRMED: ["Order ", "Confirmed!"], IN_TRANSIT: ["Order ", "On its way"], OUT_FOR_DELIVERY: ["Order ", "Out for delivery"], DELIVERED: ["Order ", "Delivered"],
  PARTIALLY_DELIVERED: ["Order ", "Partly delivered"], EXCEPTION: ["Delivery ", "Needs attention"], RTO: ["Order ", "Returning to us"],
  CANCELLED: ["Order ", "Cancelled"], PAYMENT_PENDING: ["Payment ", "Pending"], PAYMENT_FAILED: ["Payment ", "Failed"],
};
const HERO_ICON = { CONFIRMED: "fa-check", DELIVERED: "fa-check", PARTIALLY_DELIVERED: "fa-truck-fast", IN_TRANSIT: "fa-truck-fast", OUT_FOR_DELIVERY: "fa-truck-fast", PAYMENT_PENDING: "fa-hourglass-half", EXCEPTION: "fa-exclamation", RTO: "fa-rotate-left", CANCELLED: "fa-xmark", PAYMENT_FAILED: "fa-xmark" };
const LIVE_STAGES = ["CONFIRMED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "PARTIALLY_DELIVERED", "EXCEPTION"];

const CELEBRATED_KEY = "un_order_celebrated";
// One quiet pop on the mark, once per order, only right after checkout — never when history is reopened.
const useCelebrate = (view, mode) => {
  const ref = useRef(null);
  useEffect(() => {
    if (mode !== "confirmation" || view.stage.code !== "CONFIRMED") return;
    try {
      const seen = JSON.parse(sessionStorage.getItem(CELEBRATED_KEY) || "[]");
      if (seen.includes(view.orderId)) return;
      sessionStorage.setItem(CELEBRATED_KEY, JSON.stringify([...seen, view.orderId].slice(-20)));
      ref.current?.classList.add("un-pop");
    } catch {
      /* storage unavailable */
    }
  }, [mode, view.orderId, view.stage.code]);
  return ref;
};

const Hero = ({ view, mode }) => {
  const markRef = useCelebrate(view, mode);
  const { stage, payment } = view;
  const [lead, accent] = HERO_TITLE[stage.code] || ["Order ", stage.label];
  const live = !["CANCELLED", "PAYMENT_FAILED"].includes(stage.code);
  const reassure = LIVE_STAGES.includes(stage.code); // only for an order that is really on its way — never for a pending or cancelled one
  const thanks = mode === "confirmation" && stage.code === "CONFIRMED";

  return (
    <header className="uo-card" style={{ padding: undefined }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 sm:gap-5 min-w-0">
          <div ref={markRef} className="uo-circle" aria-hidden="true"><i className={`fa-solid ${HERO_ICON[stage.code] || "fa-check"}`} /></div>
          <div className="min-w-0">
            <h1 className="uo-h1">{lead}<span className="uo-red">{accent}</span></h1>
            <p className="mt-1.5 text-[12px] sm:text-[14px] text-muted leading-relaxed">
              {thanks && <>Thank you for shopping with Urban Nook. Your order has been placed successfully.<br /></>}
              {stage.message}
            </p>
          </div>
        </div>
        {reassure && (
          <div className="hidden md:flex items-center gap-4 shrink-0 pr-2">
            <div className="uo-cube" aria-hidden="true">U<b>N</b></div>
            <div><p className="font-bold text-[14px]">Your order is in good hands!</p><p className="uo-sub">We&apos;ll notify you at every step.</p></div>
          </div>
        )}
      </div>

      {/* desktop: four cells · mobile: ID, then one meta line */}
      <dl className="hidden sm:grid grid-cols-[1.5fr_1.2fr_0.7fr_1fr] gap-3 mt-5">
        <div className="uo-cell"><dt className="uo-lbl">Order ID</dt><dd className="flex items-start gap-1 font-bold text-[13px] break-all">{view.orderId}<CopyButton value={view.orderId} label="Copy order ID" /></dd></div>
        <div className="uo-cell"><dt className="uo-lbl">Order Date</dt><dd className="font-semibold text-[13px]">{formatISTDateTime(view.placedAt)}</dd></div>
        <div className="uo-cell"><dt className="uo-lbl">Items</dt><dd className="font-semibold text-[13px]">{view.itemCount} {view.itemCount === 1 ? "item" : "items"}</dd></div>
        <div className="uo-cell"><dt className="uo-lbl">Order Total</dt><dd className="font-extrabold text-[20px] leading-tight">{formatINR(payment.orderTotal)}</dd></div>
      </dl>
      <div className="sm:hidden mt-4">
        <p className="uo-lbl">Order ID</p>
        <p className="flex items-start gap-1 font-bold text-[13px] break-all">{view.orderId}<CopyButton value={view.orderId} label="Copy order ID" /></p>
        <p className="mt-1 text-[12px] text-muted">{formatISTDateTime(view.placedAt)} · {view.itemCount} {view.itemCount === 1 ? "item" : "items"} · <span className="font-bold text-ink">{formatINR(payment.orderTotal)}</span></p>
      </div>

      {reassure && (
        <div className="md:hidden mt-3 flex items-center gap-3">
          <div className="uo-cube" style={{ width: 48, height: 48, fontSize: 14 }} aria-hidden="true">U<b>N</b></div>
          <div><p className="font-bold text-[13px]">Your order is in good hands!</p><p className="uo-sub">We&apos;ll notify you at every step.</p></div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2.5 sm:gap-3">
        {live ? (
          // With a shipment: straight to the courier tracking page for the latest AWB. Before dispatch: the status section below.
          view.actions.trackUrl ? (
            <a href={view.actions.trackUrl} target="_blank" rel="noopener noreferrer" className="uo-btn uo-btn-primary basis-full sm:basis-0 grow-[1.45]"><i className="fa-solid fa-truck-fast" aria-hidden="true" />Track Order</a>
          ) : (
            <a href="#tracking" className="uo-btn uo-btn-primary basis-full sm:basis-0 grow-[1.45]"><i className="fa-solid fa-truck-fast" aria-hidden="true" />Track Order</a>
          )
        ) : (
          <Link to="/products" className="uo-btn uo-btn-primary basis-full sm:basis-0 grow-[1.45]">Continue Shopping</Link>
        )}
        {live && <Link to="/products" className="uo-btn basis-[calc(50%-5px)] sm:basis-0 grow"><i className="fa-solid fa-bag-shopping" aria-hidden="true" />Continue Shopping</Link>}
        <InvoiceButton view={view} className="basis-[calc(50%-5px)] sm:basis-0 grow" />
        <Link to="/contact-us" className="uo-btn basis-[calc(50%-5px)] sm:basis-0 grow"><i className="fa-solid fa-headset" aria-hidden="true" />Need Help?</Link>
      </div>
      {view.actions.trackAwb && (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
          Tracking number <span className="font-bold text-ink break-all">{view.actions.trackAwb}</span><CopyButton value={view.actions.trackAwb} label="Copy tracking number" />
        </p>
      )}
    </header>
  );
};

// ── invoice (only when one has been generated) ──────────────────────────────
const useInvoice = (view) => {
  const [getInvoiceLink] = useGetInvoiceLinkMutation();
  const { showNotification } = useUI();
  const [busy, setBusy] = useState(false);
  const open = async () => {
    setBusy(true);
    try {
      const url = (await getInvoiceLink(view.razorpayOrderId).unwrap())?.data?.url;
      if (!url) throw new Error("no url");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      showNotification("We couldn't open the invoice just now. Please try again in a moment.", "error");
    } finally {
      setBusy(false);
    }
  };
  return { open, busy, available: view.invoice.available && !!view.razorpayOrderId };
};
const InvoiceButton = ({ view, className = "" }) => {
  const { open, busy, available } = useInvoice(view);
  if (!available) return null;
  return <button type="button" onClick={open} disabled={busy} className={`uo-btn ${className}`}><i className="fa-regular fa-file-lines" aria-hidden="true" />{busy ? "Opening…" : "Download Invoice"}</button>;
};

// ── tracking ─────────────────────────────────────────────────────────────────
const PANEL = {
  CONFIRMED: ["fa-box", "Your order is being prepared", "We're packing your items. You'll get tracking details once it's dispatched."],
  PAYMENT_PENDING: ["fa-hourglass-half", null, null],
};
const PANEL_ICON = { IN_TRANSIT: "fa-truck-fast", OUT_FOR_DELIVERY: "fa-truck-fast", DELIVERED: "fa-box-open", PARTIALLY_DELIVERED: "fa-truck-fast", EXCEPTION: "fa-triangle-exclamation", RTO: "fa-rotate-left" };

const Stepper = ({ steps }) => (
  <ol className="uo-steps" aria-label="Order progress">
    {steps.map((s) => (
      <li key={s.key} className={`uo-step ${s.state} ${s.mobileHidden ? "m-hide" : ""}`} aria-current={s.state === "current" ? "step" : undefined}>
        <span className="uo-dot" aria-hidden="true">{s.state === "done" && <i className="fa-solid fa-check" />}</span>
        <span className="uo-step-l block">
          <span className="hidden sm:inline">{s.label}</span><span className="sm:hidden">{s.short || s.label}</span>
          <span className="sr-only">{s.state === "done" ? " — completed" : s.state === "current" ? " — in progress" : " — upcoming"}</span>
        </span>
        {s.at ? (
          <>
            <span className="uo-step-t hidden sm:block">{formatISTStep(s.at)}</span>
            <span className="uo-step-t block sm:hidden">{formatISTShort(s.at)}</span>
          </>
        ) : s.state === "current" ? <span className="uo-step-p block">In progress</span> : null}
      </li>
    ))}
  </ol>
);

const Shipment = ({ s, index, total }) => {
  const [open, setOpen] = useState(false);
  return (
    <article className="uo-cell" style={{ padding: "12px 14px" }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-[13px]">{total > 1 ? `Parcel ${index + 1} of ${total} · ` : ""}{s.label}</p>
        {s.courier && <p className="uo-sub">{s.courier}{s.service ? ` · ${s.service}` : ""}</p>}
      </div>
      {s.detail && <p className="mt-2 text-[12px]"><span className="uo-sub">Courier note: </span>{s.detail}</p>}
      <dl className="mt-2.5 grid sm:grid-cols-3 gap-x-4 gap-y-2">
        {s.awb && <div className="min-w-0"><dt className="uo-lbl">Tracking number</dt><dd className="flex items-center gap-1 font-semibold text-[13px] break-all">{s.awb}<CopyButton value={s.awb} label="Copy tracking number" /></dd></div>}
        {s.expectedDelivery && s.stage !== "delivered" && <div><dt className="uo-lbl">Courier&apos;s estimate</dt><dd className="font-semibold text-[13px]">{formatISTDate(s.expectedDelivery)}</dd></div>}
        {s.lastUpdate && <div><dt className="uo-lbl">Last update</dt><dd className="font-semibold text-[13px]">{formatISTDateTime(s.lastUpdate)}</dd></div>}
      </dl>
      {s.items && <p className="mt-2 uo-sub">In this parcel: {s.items.map((i) => `${i.name} × ${i.quantity}`).join(", ")}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-x-5">
        {s.trackUrl && <a href={s.trackUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 min-h-[40px] font-semibold uo-red">Track on courier site <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" aria-hidden="true" /></a>}
        {s.events.length > 0 && (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={`events-${s.id}`} className="inline-flex items-center gap-1.5 min-h-[40px] font-semibold">
            {open ? "Hide" : "View"} tracking history <i className={`fa-solid fa-chevron-down text-[10px] ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
        )}
      </div>
      {open && (
        <ol id={`events-${s.id}`} className="mt-1 pt-3 border-t border-hair space-y-2.5">
          {s.events.map((e, i) => (
            <li key={`${e.at}-${i}`} className="flex gap-3">
              <span className="w-14 shrink-0 uo-sub">{formatISTShort(e.at)}</span>
              <span className="min-w-0">{e.status}{e.location ? <span className="text-muted"> · {e.location}</span> : null}{e.remarks && e.remarks !== e.status ? <span className="block uo-sub">{e.remarks}</span> : null}</span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
};

export const Tracking = ({ view }) => {
  const { timeline, shipments, stage } = view;
  if (!timeline && !shipments.length) return null; // cancelled / failed: the header already says so, and there is no journey to draw
  const [icon, head, body] = PANEL[stage.code] || [PANEL_ICON[stage.code] || "fa-box", stage.headline, stage.message];
  return (
    <Card id="tracking" title="Order Tracking" icon="fa-shield-halved" labelId="tracking-h" className="scroll-mt-20">
      {/* No progress line for exceptions or returns — that would be a false normal journey. */}
      {timeline && <Stepper steps={timeline} />}
      {(head || shipments.length === 0) && (
        <div className="uo-panel" style={{ marginTop: timeline ? 18 : 0 }}>
          <div className="uo-ibox" aria-hidden="true"><i className={`fa-solid ${icon}`} /></div>
          <div className="min-w-0"><p className="font-bold text-[14px]">{head || stage.headline}</p><p className="uo-sub mt-0.5">{body || stage.message}</p></div>
        </div>
      )}
      {shipments.length > 0 && <div className="mt-3 space-y-2.5">{shipments.map((s, i) => <Shipment key={s.id} s={s} index={i} total={shipments.length} />)}</div>}
    </Card>
  );
};

// ── payment ──────────────────────────────────────────────────────────────────
export const Payment = ({ payment }) => {
  const tone = PAYMENT_TONE[payment.state] || "info";
  const cod = payment.method !== "PREPAID";
  const owes = payment.amountDue > 0 && !["CANCELLED", "FAILED"].includes(payment.state);
  const status = (
    <span className={`inline-flex items-center gap-1.5 font-semibold text-[12px] ${tone === "success" ? "uo-green" : tone === "danger" ? "uo-red" : ""}`}>{payment.label}</span>
  );
  return (
    <Card title="Payment Status" icon="fa-receipt" labelId="payment-h" aside={<span className={`sm:hidden uo-chip ${tone === "success" ? "uo-chip-green" : "uo-chip-plain"}`}>{payment.label}</span>}>
      <div className={`uo-banner uo-hm ${BANNER[tone]} mb-3`}>
        {tone === "success" && <span className="uo-tick"><i className="fa-solid fa-check" /></span>}{status}
      </div>
      {owes && cod && payment.state !== "PENDING" && (
        <div className="uo-panel mb-3" style={{ display: "block", textAlign: "center" }}>
          <p className="uo-sub">Pay on delivery</p>
          <p className="font-extrabold text-[26px] leading-tight">{formatINR(payment.balanceOnDelivery)}</p>
          <p className="uo-sub">Keep this ready for the delivery person.</p>
        </div>
      )}
      <dl>
        <div className="uo-row"><dt>Order Total</dt><dd className="font-semibold">{formatINR(payment.orderTotal)}</dd></div>
        {payment.state === "PENDING" ? (
          <div className="uo-row"><dt>{cod ? "Advance Due Now" : "Amount Due"}</dt><dd className="font-semibold">{formatINR(cod ? payment.advanceRequired || payment.orderTotal : payment.amountDue)}</dd></div>
        ) : (
          <>
            <div className="uo-row"><dt>{cod ? "Advance Paid" : "Amount Paid"}</dt><dd className={`font-semibold ${payment.amountPaid > 0 ? "uo-green" : ""}`}>{formatINR(payment.amountPaid)}</dd></div>
            <div className="uo-row"><dt>{cod ? "Balance on Delivery" : "Amount Due"}</dt><dd className="font-semibold">{formatINR(cod ? payment.balanceOnDelivery : payment.amountDue)}</dd></div>
          </>
        )}
        {payment.refundedAmount > 0 && <div className="uo-row"><dt>Refunded</dt><dd className="font-semibold uo-green">−{formatINR(payment.refundedAmount)}</dd></div>}
        {payment.refundInProgressAmount > 0 && <div className="uo-row"><dt>Refund in progress</dt><dd className="font-semibold">{formatINR(payment.refundInProgressAmount)}</dd></div>}
        {payment.refundedAmount > 0 && <div className="uo-row"><dt>Net Amount Paid</dt><dd className="font-bold">{formatINR(payment.netPaid)}</dd></div>}
        <div className="uo-row"><dt>Payment Method</dt><dd className="font-semibold">{payment.paymentMethodName}</dd></div>
        {payment.paymentRef && (
          <div className="uo-row uo-hm"><dt>Transaction ID</dt><dd className="font-semibold inline-flex items-center gap-1">{payment.paymentRef.length > 16 ? `${payment.paymentRef.slice(0, 8)}…${payment.paymentRef.slice(-4)}` : payment.paymentRef}<CopyButton value={payment.paymentRef} label="Copy transaction ID" /></dd></div>
        )}
        {payment.paidAt && payment.amountPaid > 0 && <div className="uo-row uo-hm"><dt>Payment Date</dt><dd className="font-semibold">{formatISTDateTime(payment.paidAt)}</dd></div>}
      </dl>
      {payment.refundInProgressAmount > 0 && payment.refundedAmount === 0 && <p className="mt-2 uo-sub">Your refund is being processed. We will update this page once the bank completes it.</p>}
      {payment.refundFailedAmount > 0 && <p className="mt-2 text-[12px] uo-red">A refund of {formatINR(payment.refundFailedAmount)} didn&apos;t go through. Please contact support and we will resolve it.</p>}
    </Card>
  );
};

// ── items ────────────────────────────────────────────────────────────────────
const Item = ({ item }) => {
  const title = resolveVariantTitle(item.name, item.variantTitleTemplate, item.variant);
  const discounted = item.unitOriginal && !item.isFreeGift;
  return (
    <li className="uo-item">
      <div className="uo-img">
        {item.image ? <img src={item.image} alt={title} loading="lazy" decoding="async" width="72" height="72" /> : <i className="fa-regular fa-image text-faint" role="img" aria-label="No image available" />}
      </div>
      <div className="min-w-0">
        {item.isFreeGift && <span className="uo-chip uo-chip-red mb-1">FREE GIFT</span>}
        <h3 className="font-semibold text-[14px] sm:text-[15px] leading-snug break-words">{title}</h3>
        {item.variant && !title.includes(item.variant) && <p className="uo-sub break-words">Variant: {item.variant}</p>}
        {item.variantSku && <p className="uo-sub">SKU: {item.variantSku}</p>}
        <p className="sm:hidden mt-1 font-bold text-[14px]">{item.isFreeGift ? "FREE" : formatINR(item.lineTotal)}</p>
      </div>
      <div className="uo-qty"><span className="uo-chip uo-chip-plain">Qty: {item.quantity}</span></div>
      <div className="hidden sm:block text-right min-w-0">
        {item.isFreeGift ? (
          item.giftValue > 0 ? <p className="uo-green font-semibold">Worth {formatINR(item.giftValue)}</p> : <p className="uo-sub">Free</p>
        ) : discounted ? (
          <>
            <p><span className="line-through text-faint mr-1.5">{formatINR(item.unitOriginal)}</span><span className="font-bold uo-red">{formatINR(item.unitPaid)}</span></p>
            <span className="uo-chip uo-chip-green mt-1">You saved {formatINR(item.lineSavings)}</span>
          </>
        ) : (
          <p className="text-muted">{item.quantity > 1 ? `${formatINR(item.unitPaid)} each` : formatINR(item.unitPaid)}</p>
        )}
      </div>
      <p className="hidden sm:block text-right font-bold text-[15px]">{item.isFreeGift ? "FREE" : formatINR(item.lineTotal)}</p>
    </li>
  );
};

export const Items = ({ items }) => {
  const [all, setAll] = useState(false);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  const hidden = !all && items.length > 3;
  return (
    <Card title={`Items in Your Order (${count})`} icon="fa-clipboard-list" labelId="items-h" aside={items.length > 3 ? <button type="button" onClick={() => setAll((a) => !a)} aria-expanded={all} className="sm:hidden uo-red font-semibold text-[12px] min-h-[32px]">{all ? "Show less" : "View All"}</button> : null}>
      <ul className="list-none m-0 p-0">
        {items.map((it, i) => (
          <div key={`${it.index}-${it.productId}`} className={hidden && i >= 3 ? "hidden sm:contents" : "contents"}><Item item={it} /></div>
        ))}
      </ul>
    </Card>
  );
};

// ── price details ────────────────────────────────────────────────────────────
const PRICE_LABEL = { items: "Items Subtotal", offer: "Item Discounts", orderOffer: "Offer Discount", coupon: "Coupon Discount", adjustment: "Other Charges" };

export const Price = ({ pricing, payment }) => {
  const cod = payment.method !== "PREPAID";
  return (
    <Card title="Price Details" icon="fa-file-invoice-dollar" labelId="price-h">
      <dl>
        {pricing.lines.map((l) =>
          l.key === "shipping" ? (
            <div key={l.key} className="uo-row" style={{ alignItems: "center" }}>
              <dt className="inline-flex items-center gap-2 text-ink font-medium"><i className="fa-solid fa-truck" aria-hidden="true" />Delivery</dt>
              <dd className="font-bold">{l.free ? <>{l.original ? <span className="line-through text-faint font-normal mr-1.5">{formatINR(l.original)}</span> : null}<span className="uo-green">FREE</span></> : formatINR(l.amount)}</dd>
            </div>
          ) : (
            <div key={l.key} className="uo-row">
              <dt>{PRICE_LABEL[l.key] || l.label}{l.detail && <span className="block uo-sub break-words">{l.detail}</span>}</dt>
              <dd className={`font-semibold ${l.amount < 0 ? "uo-green" : ""}`}>{l.amount < 0 ? `−${formatINR(-l.amount)}` : formatINR(l.amount)}</dd>
            </div>
          ),
        )}
        {pricing.totalSavings && <div className="uo-row"><dt className="font-semibold text-ink">Total Savings</dt><dd className="font-bold uo-green">{formatINR(pricing.totalSavings)}</dd></div>}
      </dl>
      <div className="mt-1 pt-3 border-t border-hair flex items-baseline justify-between gap-3">
        <span className="font-bold text-[14px]">Grand Total</span>
        <span className="font-extrabold text-[22px] sm:text-[24px] leading-none">{formatINR(pricing.total)}</span>
      </div>
      <p className="text-right uo-sub mt-0.5">Incl. GST</p>
      {cod && payment.amountPaid > 0 && payment.balanceOnDelivery > 0 && (
        <dl className="mt-3 pt-3 border-t border-hair">
          <div className="uo-row"><dt>Advance Paid</dt><dd className="font-semibold uo-green">{formatINR(payment.amountPaid)}</dd></div>
          <div className="uo-row"><dt className="text-ink font-semibold">To Pay on Delivery</dt><dd className="font-bold">{formatINR(payment.balanceOnDelivery)}</dd></div>
        </dl>
      )}
    </Card>
  );
};

// ── address, contact, actions ───────────────────────────────────────────────
const Line = ({ icon, children }) => (children ? <p className="flex items-start gap-3 py-1.5 break-words"><i className={`fa-solid ${icon} w-4 mt-0.5 text-muted text-center`} aria-hidden="true" /><span className="min-w-0">{children}</span></p> : null);

export const Address = ({ d }) => {
  const cityLine = [d.city, d.state, d.pinCode].filter(Boolean).join(", ");
  return (
    <Card title="Shipping Address" icon="fa-location-dot" labelId="address-h">
      {d.addressPending ? (
        <p className="uo-sub">Your delivery address is confirmed with your payment and will appear here shortly.</p>
      ) : (
        <div className="text-[13px]">
          <Line icon="fa-user"><b>{d.name}</b>{d.phone ? <span className="block text-muted">{d.phone}</span> : null}</Line>
          <Line icon="fa-location-dot">{d.addressLine}{d.landmark ? <span className="block text-muted">Near {d.landmark}</span> : null}{cityLine ? <span className="block">{cityLine}</span> : null}</Line>
        </div>
      )}
    </Card>
  );
};

export const Contact = ({ d }) => (
  <Card title="Contact Information" icon="fa-address-book" labelId="contact-h">
    <div className="text-[13px]">
      <Line icon="fa-envelope">{d.email}</Line>
      <Line icon="fa-phone">{d.phone}{d.altPhone ? <span className="text-muted"> · {d.altPhone}</span> : null}</Line>
      {d.serviceName && <Line icon="fa-truck">{d.serviceName}</Line>}
    </div>
  </Card>
);

const ActionRow = ({ icon, label, to, href, onClick, busy }) => {
  const inner = (<><i className={`${icon} w-5 text-center text-muted`} aria-hidden="true" /><span className="flex-1 text-left">{busy ? "Opening…" : label}</span><i className="fa-solid fa-chevron-right text-[10px] text-faint" aria-hidden="true" /></>);
  const cls = "flex items-center gap-3 w-full min-h-[44px] border-t border-hair first:border-t-0 text-[13px] hover:text-brand";
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>;
  return <button type="button" onClick={onClick} disabled={busy} className={cls}>{inner}</button>;
};

// Only what exists: an invoice once generated, a courier link once there is one, support, and the policy page.
export const Actions = ({ view }) => {
  const { open, busy, available } = useInvoice(view);
  const trackUrl = view.shipments.find((s) => s.trackUrl)?.trackUrl;
  return (
    <Card title="Order Actions" icon="fa-bolt" labelId="actions-h">
      <div>
        {available && <ActionRow icon="fa-regular fa-file-lines" label="Download Invoice" onClick={open} busy={busy} />}
        {trackUrl && <ActionRow icon="fa-solid fa-truck" label="Track Shipment" href={trackUrl} />}
        <ActionRow icon="fa-solid fa-headset" label="Contact Support" to="/contact-us" />
        <ActionRow icon="fa-solid fa-box-open" label="Return / Exchange Policy" to="/return-policy" />
      </div>
    </Card>
  );
};

// ── recommendations (admin-linked; a failure or an empty list renders nothing) ─
const Recommendations = ({ orderId }) => {
  const { data, isError } = useGetOrderRecommendationsQuery(orderId, { skip: !orderId });
  const products = data?.data?.products;
  if (isError || !products?.length) return null;
  return (
    <Card className="mt-0">
      <div className="flex flex-wrap items-baseline gap-x-3 mb-3">
        <h2 className="uo-h" style={{ margin: 0 }}><i className="fa-solid fa-fire uo-red" aria-hidden="true" />You May Also Like</h2>
        <p className="uo-sub hidden sm:block">Complete your collection with these popular picks</p>
      </div>
      <div className="uo-recs">
        {products.map((p) => {
          const v = p.variantDetails?.[0];
          const price = Number(p.effectivePrice ?? v?.variantPrice ?? 0);
          return (
            <div key={p.productId} className="uo-cell" style={{ padding: 8 }}>
              <div className="relative">
                <Link to={`/products/${p.productId}`} className="block aspect-[4/3] overflow-hidden bg-surface" style={{ borderRadius: 6 }}>
                  {v?.variantImage?.[0] ? <img src={v.variantImage[0]} alt={p.productName} loading="lazy" decoding="async" className="w-full h-full object-cover" /> : null}
                </Link>
                <div className="absolute top-1.5 right-1.5"><WishlistButton productId={p.productId} size="sm" /></div>
              </div>
              <p className="mt-2 font-semibold text-[12px] leading-snug line-clamp-2 min-h-[2.4em]">{p.productName}</p>
              <p className="font-bold text-[13px]">{formatINR(price)}</p>
              <Link to={`/products/${p.productId}`} className="uo-btn mt-2 w-full" style={{ minHeight: 36, fontSize: 12 }}>View Product</Link>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

// ── the page ─────────────────────────────────────────────────────────────────
// Desktop: main column (tracking · items · address/contact) + sidebar (payment · price · actions).
// Mobile: one column in the approved order — tracking, payment, items, price, address/contact, actions.
export const OrderPageBody = ({ view, mode = "details" }) => (
  <div className="flex flex-col gap-3 lg:gap-4">
    <Hero view={view} mode={mode} />
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,31%)] lg:gap-4 lg:items-start">
      <div className="contents lg:flex lg:flex-col lg:gap-4 lg:min-w-0">
        <div className="order-1 lg:order-none"><Tracking view={view} /></div>
        <div className="order-3 lg:order-none"><Items items={view.items} /></div>
        <div className="order-5 lg:order-none grid gap-3 md:grid-cols-[1.25fr_1fr] lg:gap-4"><Address d={view.delivery} /><Contact d={view.delivery} /></div>
      </div>
      <div className="contents lg:flex lg:flex-col lg:gap-4 lg:min-w-0">
        <div className="order-2 lg:order-none"><Payment payment={view.payment} /></div>
        <div className="order-4 lg:order-none"><Price pricing={view.pricing} payment={view.payment} /></div>
        <div className="order-6 lg:order-none"><Actions view={view} /></div>
      </div>
    </div>
    {!["CANCELLED", "PAYMENT_FAILED"].includes(view.stage.code) && <Recommendations orderId={view.orderId} />}
  </div>
);

export const OrderPageShell = ({ children }) => (
  <main className="uo min-h-screen font-inter">
    <div className="max-w-[1380px] mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-5 pb-28 md:pb-12">{children}</div>
  </main>
);

const Skeleton = () => (
  <div className="flex flex-col gap-3 animate-pulse" role="status" aria-label="Loading your order">
    <div className="uo-card h-56" />
    <div className="grid lg:grid-cols-[1fr_31%] gap-3"><div className="uo-card h-72" /><div className="uo-card h-72" /></div>
  </div>
);

const Problem = ({ title, body, action }) => (
  <div className="uo-card text-center" style={{ padding: 32 }}>
    <h1 className="uo-h1" style={{ fontSize: 22 }}>{title}</h1>
    <p className="uo-sub mt-2">{body}</p>
    <div className="mt-5 flex justify-center gap-2">{action || <><Link to="/orders" className="uo-btn">My Orders</Link><Link to="/contact-us" className="uo-btn">Contact Support</Link></>}</div>
  </div>
);

/** `mode`: "confirmation" straight after checkout (one-time flourish) · "details" for an existing order. */
export const OrderDetailsView = ({ orderId, mode = "details" }) => {
  const { data, isLoading, isError, error, refetch } = useGetOrderViewQuery(orderId, { refetchOnMountOrArgChange: true });
  const view = data?.data;
  let body;
  if (isLoading) body = <Skeleton />;
  else if (isError && (error?.status === 404 || error?.originalStatus === 404)) body = <Problem title="We couldn't find this order" body="It may belong to another account. Sign in with the account you ordered from, or contact us." />;
  else if (isError || !view) body = <Problem title="We couldn't load your order" body="Check your connection and try again. Your order is safe." action={<button type="button" onClick={refetch} className="uo-btn uo-btn-primary">Try again</button>} />;
  else body = <OrderPageBody view={view} mode={mode} />;
  return <OrderPageShell>{body}</OrderPageShell>;
};

/** Route component for /orders/:orderId (an existing order — no new-order celebration). */
const OrderDetailsPage = () => {
  const { orderId } = useParams();
  useEffect(() => { window.scrollTo(0, 0); }, [orderId]);
  return <OrderDetailsView orderId={orderId} mode="details" />;
};
export default OrderDetailsPage;

// ── archive row ──────────────────────────────────────────────────────────────
export const OrderSummaryCard = ({ order }) => {
  const tone = PAYMENT_TONE[order.payment.state] || "info";
  const due = order.payment.amountDue > 0 && !["CANCELLED", "FAILED", "PENDING"].includes(order.payment.state);
  return (
    <article className="uo-card">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1 font-bold text-[14px]">Order <span className="font-mono">…{shortRef(order.orderId)}</span><CopyButton value={order.orderId} label="Copy full order ID" /></p>
          <p className="uo-sub">Placed {formatISTDate(order.placedAt)} · {order.itemCount} {order.itemCount === 1 ? "item" : "items"}</p>
        </div>
        <div className="text-right">
          <p className="font-extrabold text-[18px] leading-tight">{formatINR(order.payment.orderTotal)}</p>
          {due && <p className="text-[12px] font-semibold">{formatINR(order.payment.amountDue)} on delivery</p>}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2" aria-label="Items in this order">
        {order.preview.map((p, i) => (
          <div key={i} className="uo-img relative" style={{ width: 56, height: 56 }} title={`${p.name} × ${p.quantity}`}>
            {p.image ? <img src={p.image} alt={p.name} loading="lazy" decoding="async" width="56" height="56" /> : <i className="fa-regular fa-image text-faint" aria-hidden="true" />}
            {p.quantity > 1 && <span className="absolute bottom-0 right-0 bg-ink text-paper text-[10px] px-1">×{p.quantity}</span>}
          </div>
        ))}
        {order.extraItems > 0 && <span className="uo-sub">+{order.extraItems} more</span>}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="uo-chip uo-chip-plain">{order.stage.label}</span>
          <span className={`uo-chip ${tone === "success" ? "uo-chip-green" : tone === "danger" ? "uo-chip-red" : "uo-chip-plain"}`}>{order.payment.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {order.canTrack && <Link to={`/orders/${order.orderId}#tracking`} className="uo-btn" style={{ minHeight: 40 }}>Track</Link>}
          <Link to={`/orders/${order.orderId}`} className="uo-btn uo-btn-primary" style={{ minHeight: 40 }}>View details</Link>
        </div>
      </div>
    </article>
  );
};
