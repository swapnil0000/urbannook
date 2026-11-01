import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

// "Order Confirmed" must only ever be shown for a paid order — this page is reachable by URL, back button and bookmark.
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn() }));
vi.mock("../../hooks/useRedux", () => ({ useUI: () => ({ showNotification: vi.fn() }) }));
vi.mock("../../config/appUrls", () => ({ getApiUrl: () => "http://api.test" }));
vi.mock("../../component/layout/auth/GoogleLoginButton", () => ({ default: () => null }));
vi.mock("../../component/orders/OrderPage", () => ({ OrderDetailsView: ({ orderId, mode }) => <div>Order page for {orderId} ({mode})</div> }));

import OrderConfirm from "../OrderConfirm";

const Where = () => {
  const { pathname, state } = useLocation();
  return <div data-testid="where">{pathname}{state?.reason ? `?reason=${state.reason}` : ""}</div>;
};

const open = async (apiBody) => {
  globalThis.fetch = vi.fn().mockResolvedValue({ json: async () => apiBody });
  render(
    <MemoryRouter initialEntries={["/order-confirm/order_abc"]}>
      <Routes>
        <Route path="/order-confirm/:orderId" element={<OrderConfirm />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
};

beforeEach(() => vi.restoreAllMocks());

describe("order confirm page", () => {
  for (const status of ["PAID", "CONFIRMED", "SHIPPED", "DELIVERED"]) {
    it(`${status}: signed-in customer gets the full order page`, async () => {
      await open({ data: { status, isGuestOrder: false } });
      expect(await screen.findByText("Order page for order_abc (confirmation)")).toBeTruthy();
    });
  }

  it("guest customer still sees the account/login confirmation", async () => {
    await open({ data: { status: "PAID", isGuestOrder: true, guestEmail: "g@example.com", isNewGuestAccount: true } });
    expect(await screen.findByText("Order Confirmed!")).toBeTruthy();
    expect(screen.getByText("g@example.com")).toBeTruthy();
  });

  for (const status of ["CREATED", "PROCESSING"]) {
    it(`${status}: not paid yet - waits on the processing page, never says confirmed`, async () => {
      await open({ data: { status, isGuestOrder: false } });
      await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/payment-processing/order_abc"));
      expect(screen.queryByText("Order Confirmed!")).toBeNull();
    });
  }

  it("FAILED: payment failed page", async () => {
    await open({ data: { status: "FAILED", isGuestOrder: false } });
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/payment-failed?reason=failed"));
    expect(screen.queryByText("Order Confirmed!")).toBeNull();
  });

  it("CANCELLED: payment failed page with the cancelled message", async () => {
    await open({ data: { status: "CANCELLED", isGuestOrder: false } });
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/payment-failed?reason=cancelled"));
  });

  it("unknown order (no data): not a success", async () => {
    await open({ message: "Order not found" });
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/payment-failed?reason=notfound"));
    expect(screen.queryByText("Order Confirmed!")).toBeNull();
  });

  it("network error: not a success", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("offline"));
    render(
      <MemoryRouter initialEntries={["/order-confirm/order_abc"]}>
        <Routes>
          <Route path="/order-confirm/:orderId" element={<OrderConfirm />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/payment-failed?reason=notfound"));
  });
});
