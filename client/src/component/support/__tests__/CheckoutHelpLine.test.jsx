import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// The call/WhatsApp line shown after a failed or cancelled payment: a call only
// when someone can pick up (Mon-Sat 9-19 IST), WhatsApp always, order typed in.
const tracked = [];
vi.mock("../../../utils/analytics", () => ({ track: (name, params) => tracked.push({ name, params }) }));

const { isSupportCallOpen } = await import("../../../utils/contactHelper");
const { default: CheckoutHelpLine } = await import("../CheckoutHelpLine");

// UTC instants for IST wall-clock times (IST = UTC+5:30)
const IST = (iso) => new Date(new Date(`${iso}Z`).getTime() - 330 * 60 * 1000);

describe("isSupportCallOpen (IST, whatever the browser's time zone)", () => {
  it.each([
    ["2026-11-16T09:00:00", true], // Monday 9:00
    ["2026-11-16T18:59:00", true],
    ["2026-11-16T19:00:00", false],
    ["2026-11-16T08:59:00", false],
    ["2026-11-21T12:00:00", true], // Saturday
    ["2026-11-22T12:00:00", false], // Sunday
  ])("%s IST → %s", (t, open) => expect(isSupportCallOpen(IST(t))).toBe(open));
});

describe("CheckoutHelpLine", () => {
  beforeEach(() => { tracked.length = 0; vi.useFakeTimers({ toFake: ["Date"] }); });
  afterEach(() => vi.useRealTimers());

  it("in support hours: call and WhatsApp, with the order in the message", () => {
    vi.setSystemTime(IST("2026-11-16T11:00:00"));
    render(<CheckoutHelpLine reason="payment_failed" orderId="order_ABC" value={1798} />);
    expect(screen.getByRole("link", { name: /Call \+91 91240 81005/ }).getAttribute("href")).toBe("tel:+919124081005");
    const wa = screen.getByRole("link", { name: /WhatsApp us/ }).getAttribute("href");
    expect(decodeURIComponent(wa)).toContain("order_ABC");
    expect(decodeURIComponent(wa)).toContain("₹1,798");
    expect(tracked[0]).toMatchObject({ name: "checkout_help_shown", params: { reason: "payment_failed", call_open: true, placement: "error_box" } });
  });

  it("outside support hours: WhatsApp only, so no call rings unanswered", () => {
    vi.setSystemTime(IST("2026-11-16T22:30:00"));
    render(<CheckoutHelpLine reason="payment_cancelled" />);
    expect(screen.queryByRole("link", { name: /Call/ })).toBeNull();
    expect(screen.getByRole("link", { name: /WhatsApp us/ })).toBeTruthy();
    expect(screen.getByText(/WhatsApp us now and we'll reply/)).toBeTruthy();
  });

  it("tracks which button was used and where", () => {
    vi.setSystemTime(IST("2026-11-16T11:00:00"));
    render(<CheckoutHelpLine reason="payment_cancelled" placement="cancel_feedback" orderId="order_X" />);
    fireEvent.click(screen.getByRole("link", { name: /Call/ }));
    expect(tracked.at(-1)).toMatchObject({ name: "checkout_help_click", params: { channel: "call", placement: "cancel_feedback", order_id: "order_X" } });
  });
});
