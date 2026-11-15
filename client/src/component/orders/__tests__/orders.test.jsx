import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../../store/api/userApi", () => ({
  useGetInvoiceLinkMutation: () => [vi.fn(), {}],
  useGetOrderRecommendationsQuery: () => ({ data: undefined, isError: true }),
  useGetOrderViewQuery: () => ({}),
}));
vi.mock("../../../hooks/useRedux", () => ({ useUI: () => ({ showNotification: vi.fn() }) }));
vi.mock("../../WishlistButton", () => ({ default: () => null }));

import { OrderPageBody, OrderSummaryCard, Tracking, Payment, Price, Items, Actions } from "../OrderPage";

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);
// the row's value cell, found by its label (labels repeat in chips/headings)
const valueOf = (label) => screen.getAllByText(label).find((el) => el.tagName === "DT").nextSibling.textContent;

const payment = (over = {}) => ({
  state: "PAID", label: "Payment Successful", method: "PREPAID", paymentMethodName: "Razorpay", orderTotal: 1448, amountPaid: 1448, amountDue: 0,
  balanceOnDelivery: 0, advanceRequired: 0, refundedAmount: 0, refundInProgressAmount: 0, refundFailedAmount: 0, netPaid: 1448, paidAt: "2026-10-28T10:00:00.000Z", paymentRef: "pay_ABCDEFGH12345678", ...over,
});
const stage = (over = {}) => ({ code: "CONFIRMED", label: "Confirmed", headline: "Your order is confirmed", message: "We're getting it ready.", tone: "success", ...over });
const item = (over = {}) => ({ index: 0, productId: "p1", name: "Wooden Katana", variantTitleTemplate: "", variant: "Black Blade", variantSku: "KAT-B", image: "k.jpg", quantity: 2, unitPaid: 1299, unitOriginal: null, lineTotal: 2598, lineSavings: 0, isFreeGift: false, giftValue: null, ...over });
const steps = [
  { key: "placed", label: "Order placed", short: "Placed", at: "2026-10-28T10:00:00.000Z", state: "done" },
  { key: "confirmed", label: "Payment confirmed", short: "Payment", at: "2026-10-28T10:01:00.000Z", state: "done" },
  { key: "preparing", label: "Preparing", short: "Preparing", at: null, state: "current" },
  { key: "shipped", label: "Shipped", short: "Shipped", at: null, state: "upcoming" },
  { key: "out_for_delivery", label: "Out for delivery", short: "Out for delivery", mobileHidden: true, at: null, state: "upcoming" },
  { key: "delivered", label: "Delivered", short: "Delivered", at: null, state: "upcoming" },
];
const shipment = (over = {}) => ({ id: "s1", stage: "in_transit", label: "In transit", message: "On its way.", detail: null, isDelayed: false, awb: "AWB123", courier: "Delhivery", service: "Surface", expectedDelivery: "2026-11-02T00:00:00.000Z", lastUpdate: "2026-10-30T10:00:00.000Z", trackUrl: "https://panel.shipmozo.com/track-order?awb=AWB123", events: [{ status: "In Transit", location: "Pune", at: "2026-10-30T10:00:00.000Z", remarks: "" }], items: null, ...over });
const view = (over = {}) => ({
  orderId: "0192f0aa-1111-7aaa-8bbb-123456789abc", razorpayOrderId: "order_X", placedAt: "2026-10-28T10:00:00.000Z", status: "PAID", stage: stage(), payment: payment(), itemCount: 2, items: [item()],
  pricing: { lines: [{ key: "items", label: "Items", amount: 2598 }, { key: "shipping", label: "Delivery", amount: 149, free: false }], total: 2747, totalSavings: null },
  shipments: [], timeline: steps, delivery: { name: "Aarav", phone: "9876543210", email: "a@example.com", addressLine: "12 MG Road", city: "Bengaluru", state: "KA", pinCode: "560038" },
  actions: { track: false, invoice: false }, invoice: { available: false }, ...over,
});

beforeEach(() => sessionStorage.clear());

describe("hero", () => {
  it("confirmation: 'Order Confirmed!', thank-you text, the whole order id with copy, date, items and total", () => {
    wrap(<OrderPageBody view={view()} mode="confirmation" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Order Confirmed!");
    expect(screen.getByText(/Thank you for shopping with Urban Nook/)).toBeTruthy();
    expect(screen.getAllByText("0192f0aa-1111-7aaa-8bbb-123456789abc").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /copy order id/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("₹1,448.00").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /track order/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /need help/i })).toBeTruthy();
  });

  it("reopening an order does not thank or celebrate again", () => {
    wrap(<OrderPageBody view={view({ stage: stage({ code: "DELIVERED", label: "Delivered", message: "We hope you love it." }) })} mode="details" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Order Delivered");
    expect(screen.queryByText(/Thank you for shopping/)).toBeNull();
    expect(document.querySelector(".un-pop")).toBeNull();
  });

  it("the pop runs once per order after checkout", () => {
    const v = view();
    const first = wrap(<OrderPageBody view={v} mode="confirmation" />);
    expect(document.querySelector(".un-pop")).not.toBeNull();
    first.unmount();
    wrap(<OrderPageBody view={v} mode="confirmation" />);
    expect(document.querySelector(".un-pop")).toBeNull();
  });

  it("an unpaid or cancelled order never reads as confirmed", () => {
    wrap(<OrderPageBody view={view({ stage: stage({ code: "PAYMENT_PENDING", label: "Payment pending", message: "Confirming." }), payment: payment({ state: "PENDING", label: "Payment Pending" }) })} mode="confirmation" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Payment Pending");
    expect(screen.queryAllByText(/good hands/)).toHaveLength(0); // no reassurance until the payment is confirmed
  });

  it("a cancelled order: no 'good hands' promise, primary action is shopping", () => {
    wrap(<OrderPageBody view={view({ stage: stage({ code: "CANCELLED", label: "Cancelled", message: "It will not be delivered.", tone: "danger" }), timeline: null })} mode="details" />);
    expect(screen.queryByText(/good hands/)).toBeNull();
    expect(screen.queryByRole("link", { name: /track order/i })).toBeNull();
  });

  it("Track Order opens the courier tracking page for the latest AWB, with a copy button for the number", () => {
    const url = "https://panel.shipmozo.com/track-order?uid=U1&awb=31293317112722";
    wrap(<OrderPageBody view={view({ actions: { track: true, trackUrl: url, trackAwb: "31293317112722" }, shipments: [shipment({ awb: "31293317112722", trackUrl: url })] })} />);
    const link = screen.getByRole("link", { name: /track order/i });
    expect(link.getAttribute("href")).toBe(url);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(screen.getAllByText("31293317112722").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /copy tracking number/i }).length).toBeGreaterThan(1); // hero + shipment card
  });

  it("before dispatch Track Order just scrolls to the status section (no AWB, no link out)", () => {
    wrap(<OrderPageBody view={view()} />);
    expect(screen.getByRole("link", { name: /track order/i }).getAttribute("href")).toBe("#tracking");
    expect(screen.queryByText(/Tracking number/)).toBeNull();
  });

  it("the invoice button exists only when an invoice does", () => {
    const { unmount } = wrap(<OrderPageBody view={view()} />);
    expect(screen.queryByRole("button", { name: /download invoice/i })).toBeNull();
    unmount();
    wrap(<OrderPageBody view={view({ invoice: { available: true } })} />);
    expect(screen.getAllByRole("button", { name: /download invoice/i }).length).toBeGreaterThan(0);
  });
});

describe("tracking", () => {
  it("an order being prepared says Preparing (not Shipped) and promises no tracking yet", () => {
    wrap(<Tracking view={view()} />);
    const list = screen.getByRole("list", { name: /order progress/i });
    expect(within(list).getAllByText("Preparing")[0].closest("li").getAttribute("aria-current")).toBe("step");
    expect(within(list).getAllByText("Shipped")[0].closest("li").className).toContain("upcoming");
    expect(screen.getByText("Your order is being prepared")).toBeTruthy();
    expect(screen.queryByText(/Tracking number/)).toBeNull();
  });

  it("a shipment shows courier, copyable AWB, estimate, last update, a safe external link, expandable history", () => {
    wrap(<Tracking view={view({ shipments: [shipment()], stage: stage({ code: "IN_TRANSIT", headline: "Your order is on its way", message: "Track it below." }) })} />);
    expect(screen.getByText("AWB123")).toBeTruthy();
    expect(screen.getByText("Delhivery · Surface")).toBeTruthy();
    const link = screen.getByRole("link", { name: /track on courier site/i });
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(screen.queryByText(/Pune/)).toBeNull();
    const toggle = screen.getByRole("button", { name: /view tracking history/i });
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(/Pune/)).toBeTruthy();
  });

  it("courier text is rendered as text, never markup", () => {
    wrap(<Tracking view={view({ shipments: [shipment({ events: [{ status: "<img src=x onerror=alert(1)>", location: "", at: "2026-10-30T10:00:00.000Z", remarks: "" }] })] })} />);
    fireEvent.click(screen.getByRole("button", { name: /view tracking history/i }));
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeTruthy();
    expect(document.querySelector("img[src='x']")).toBeNull();
  });

  it("an exception draws no progress line, only the guidance and the courier's note", () => {
    wrap(<Tracking view={view({ stage: stage({ code: "EXCEPTION", headline: "Delivery needs your attention", message: "The courier couldn't complete delivery." }), timeline: null, shipments: [shipment({ stage: "exception", label: "Delivery needs attention", detail: "Customer not available" })] })} />);
    expect(screen.queryByRole("list", { name: /order progress/i })).toBeNull();
    expect(screen.getByText("Delivery needs your attention")).toBeTruthy();
    expect(screen.getByText("Customer not available")).toBeTruthy();
  });

  it("two parcels are shown separately, with their items", () => {
    wrap(<Tracking view={view({ shipments: [shipment({ id: "a", stage: "delivered", label: "Delivered", items: [{ name: "Katana", quantity: 1 }] }), shipment({ id: "b", awb: "AWB2", items: [{ name: "Stand", quantity: 1 }] })] })} />);
    expect(screen.getByText(/Parcel 1 of 2/)).toBeTruthy();
    expect(screen.getByText(/Parcel 2 of 2/)).toBeTruthy();
    expect(screen.getByText(/In this parcel: Katana × 1/)).toBeTruthy();
  });

  it("nothing to draw for a cancelled order", () => {
    const { container } = wrap(<Tracking view={view({ stage: stage({ code: "CANCELLED" }), timeline: null, shipments: [] })} />);
    expect(container.textContent).toBe("");
  });
});

describe("payment status", () => {
  it("prepaid: paid in full, nothing due, method and transaction id", () => {
    wrap(<Payment payment={payment()} />);
    expect(valueOf("Amount Paid")).toBe("₹1,448.00");
    expect(valueOf("Amount Due")).toBe("₹0.00");
    expect(valueOf("Payment Method")).toBe("Razorpay");
    expect(screen.getByText("pay_ABCD…5678")).toBeTruthy();
    expect(screen.getByRole("button", { name: /copy transaction id/i })).toBeTruthy();
  });

  it("full COD: ₹0 paid and the whole total shown as payable on delivery", () => {
    wrap(<Payment payment={payment({ state: "COD_DUE", label: "Cash on Delivery", method: "COD", paymentMethodName: "Cash on delivery", amountPaid: 0, amountDue: 1448, balanceOnDelivery: 1448, netPaid: 0, paymentRef: null })} />);
    expect(screen.getByText("Pay on delivery")).toBeTruthy();
    expect(valueOf("Advance Paid")).toBe("₹0.00");
    expect(valueOf("Balance on Delivery")).toBe("₹1,448.00");
  });

  it("partial COD: ₹2,500 total, ₹500 advance, ₹2,000 on delivery", () => {
    wrap(<Payment payment={payment({ state: "ADVANCE_PAID", label: "Advance Paid", method: "PARTIAL_COD", orderTotal: 2500, amountPaid: 500, amountDue: 2000, balanceOnDelivery: 2000, advanceRequired: 500, netPaid: 500 })} />);
    expect(valueOf("Order Total")).toBe("₹2,500.00");
    expect(valueOf("Advance Paid")).toBe("₹500.00");
    expect(valueOf("Balance on Delivery")).toBe("₹2,000.00");
  });

  it("pending: shows what is due, never 'paid'", () => {
    wrap(<Payment payment={payment({ state: "PENDING", label: "Payment Pending", amountPaid: 0, amountDue: 1448, netPaid: 0, paymentRef: null, paidAt: null })} />);
    expect(screen.queryByText("Amount Paid")).toBeNull();
    expect(valueOf("Amount Due")).toBe("₹1,448.00");
  });

  it("a refund in progress is not shown as refunded; a completed one shows the net paid", () => {
    const { unmount } = wrap(<Payment payment={payment({ state: "REFUND_PROCESSING", label: "Refund in progress", refundInProgressAmount: 1448 })} />);
    expect(screen.queryByText("Refunded")).toBeNull();
    expect(screen.getByText(/being processed/i)).toBeTruthy();
    unmount();
    wrap(<Payment payment={payment({ state: "PARTIALLY_REFUNDED", label: "Partially refunded", refundedAmount: 300, netPaid: 1148 })} />);
    expect(valueOf("Refunded")).toBe("−₹300.00");
    expect(valueOf("Net Amount Paid")).toBe("₹1,148.00");
  });
});

describe("items", () => {
  it("quantity is always readable, with the unit price and the line total", () => {
    wrap(<Items items={[item()]} />);
    expect(screen.getByText("Qty: 2")).toBeTruthy();
    expect(screen.getByText("₹1,299.00 each")).toBeTruthy();
    expect(screen.getAllByText("₹2,598.00").length).toBeGreaterThan(0);
    expect(screen.getByText("Variant: Black Blade")).toBeTruthy();
    expect(screen.getByText("SKU: KAT-B")).toBeTruthy();
  });

  it("a discounted item shows original → paid and the saving", () => {
    const { container } = wrap(<Items items={[item({ quantity: 1, unitPaid: 179, unitOriginal: 299, lineTotal: 179, lineSavings: 120 })]} />);
    expect(container.querySelector(".line-through").textContent).toBe("₹299.00");
    expect(screen.getByText("You saved ₹120.00")).toBeTruthy();
  });

  it("a free gift is badged, priced FREE, and its worth shown only when recorded", () => {
    const gift = (giftValue) => item({ isFreeGift: true, quantity: 1, unitPaid: 0, lineTotal: 0, giftValue });
    const { unmount } = wrap(<Items items={[gift(499)]} />);
    expect(screen.getByText("FREE GIFT")).toBeTruthy();
    expect(screen.getByText("Worth ₹499.00")).toBeTruthy();
    unmount();
    wrap(<Items items={[gift(null)]} />);
    expect(screen.queryByText(/Worth/)).toBeNull();
  });

  it("a missing image falls back to an icon", () => {
    wrap(<Items items={[item({ image: null })]} />);
    expect(screen.getByRole("img", { name: /no image/i })).toBeTruthy();
  });

  it("more than three items: the rest are collapsed on phones behind 'View All'", () => {
    const many = Array.from({ length: 5 }, (_, i) => item({ index: i, productId: `p${i}`, name: `P${i}` }));
    wrap(<Items items={many} />);
    const toggle = screen.getByRole("button", { name: "View All" });
    expect(document.querySelectorAll(".hidden.sm\\:contents").length).toBe(2);
    fireEvent.click(toggle);
    expect(document.querySelectorAll(".hidden.sm\\:contents").length).toBe(0);
  });
});

describe("price details", () => {
  const pricing = (over = {}) => ({ lines: [{ key: "items", label: "Items", amount: 1698 }, { key: "offer", label: "Offer discount", amount: -200 }, { key: "coupon", label: "Coupon", amount: -100, detail: "SAVE100" }, { key: "shipping", label: "Delivery", amount: 149, free: false }], total: 1547, totalSavings: 300, ...over });

  it("lists each line, discounts as negatives, the coupon code, total savings and the grand total", () => {
    wrap(<Price pricing={pricing()} payment={payment()} />);
    expect(valueOf("Items Subtotal")).toBe("₹1,698.00");
    expect(valueOf("Item Discounts")).toBe("−₹200.00");
    expect(screen.getByText("SAVE100")).toBeTruthy();
    expect(valueOf("Total Savings")).toBe("₹300.00");
    expect(screen.getByText("₹1,547.00")).toBeTruthy();
  });

  it("free delivery: the waived charge struck through only when the order recorded it", () => {
    const free = { key: "shipping", label: "Delivery", amount: 0, free: true, original: 149 };
    const { container, unmount } = wrap(<Price pricing={pricing({ lines: [free] })} payment={payment()} />);
    expect(screen.getByText("FREE")).toBeTruthy();
    expect(container.querySelector(".line-through").textContent).toBe("₹149.00");
    unmount();
    const again = wrap(<Price pricing={pricing({ lines: [{ ...free, original: null }] })} payment={payment()} />);
    expect(again.container.querySelector(".line-through")).toBeNull();
  });

  it("no savings row when nothing was saved", () => {
    wrap(<Price pricing={pricing({ totalSavings: null })} payment={payment()} />);
    expect(screen.queryByText("Total Savings")).toBeNull();
  });

  it("partial COD adds the advance and the balance under the grand total", () => {
    wrap(<Price pricing={pricing({ total: 2500 })} payment={payment({ method: "PARTIAL_COD", orderTotal: 2500, amountPaid: 500, amountDue: 2000, balanceOnDelivery: 2000 })} />);
    expect(valueOf("To Pay on Delivery")).toBe("₹2,000.00");
  });
});

describe("page layout and actions", () => {
  it("mobile order is tracking → payment → items → price → address/contact → actions", () => {
    wrap(<OrderPageBody view={view()} />);
    const order = (heading) => Number(screen.getByRole("heading", { name: heading }).closest("[class*='order-']").className.match(/(?:^|\s)order-(\d)/)[1]);
    expect([order("Order Tracking"), order("Payment Status"), order(/Items in Your Order/), order("Price Details"), order("Shipping Address"), order("Order Actions")]).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("actions offer only what exists: support and the policy always; invoice and courier link only when real", () => {
    const { unmount } = wrap(<Actions view={view()} />);
    expect(screen.getByRole("link", { name: /contact support/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /return \/ exchange policy/i }).getAttribute("href")).toBe("/return-policy");
    expect(screen.queryByText(/Download Invoice/)).toBeNull();
    expect(screen.queryByText(/Track Shipment/)).toBeNull();
    unmount();
    wrap(<Actions view={view({ invoice: { available: true }, shipments: [shipment()] })} />);
    expect(screen.getByText("Download Invoice")).toBeTruthy();
    expect(screen.getByRole("link", { name: /track shipment/i }).getAttribute("rel")).toContain("noopener");
  });

  it("a recommendations failure renders nothing and the page is intact", () => {
    wrap(<OrderPageBody view={view()} />);
    expect(screen.queryByText("You May Also Like")).toBeNull();
    expect(screen.getByRole("heading", { name: "Price Details" })).toBeTruthy();
  });
});

describe("archive row", () => {
  const order = (over = {}) => ({
    orderId: "0192f0aa-1111-7aaa-8bbb-123456789abc", placedAt: "2026-10-28T10:00:00.000Z", status: "PAID", stage: { code: "IN_TRANSIT", label: "On its way", tone: "info" },
    payment: { state: "ADVANCE_PAID", label: "Advance paid", orderTotal: 2500, amountPaid: 500, amountDue: 2000, method: "PARTIAL_COD" }, itemCount: 5,
    preview: [{ name: "A", image: "a.jpg", quantity: 2 }, { name: "B", image: null, quantity: 1 }], extraItems: 3, canTrack: true, ...over,
  });

  it("tells orders apart at a glance and links to details and tracking", () => {
    wrap(<OrderSummaryCard order={order()} />);
    expect(screen.getByText("…56789ABC")).toBeTruthy();
    expect(screen.getByText("₹2,500.00")).toBeTruthy();
    expect(screen.getByText("₹2,000.00 on delivery")).toBeTruthy();
    expect(screen.getByText("On its way")).toBeTruthy();
    expect(screen.getByText("+3 more")).toBeTruthy();
    expect(screen.getByRole("link", { name: "View details" }).getAttribute("href")).toBe("/orders/0192f0aa-1111-7aaa-8bbb-123456789abc");
    expect(screen.getByRole("link", { name: "Track" }).getAttribute("href")).toContain("#tracking");
  });

  it("no Track link when there is nothing to track", () => {
    wrap(<OrderSummaryCard order={order({ canTrack: false })} />);
    expect(screen.queryByRole("link", { name: "Track" })).toBeNull();
  });
});
