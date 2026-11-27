import { describe, expect, it, vi } from "vitest";
import {
  addOneMonth,
  getOrderDecision,
  makeEventKey,
  normalizeCustomerEmail,
  selectUniquePendingRow,
  verifySignature,
  type CaktoOrder,
} from "../../supabase/functions/cakto-webhook/logic";

const PRODUCT_ID = "test-product-only";
const validOrder: CaktoOrder = {
  id: "test-order-001",
  status: "paid",
  amount: 29.9,
  currency: "BRL",
  product: { id: PRODUCT_ID, type: "subscription" },
  subscription: { id: "test-subscription-001" },
  customer: { email: "  TEST@example.com " },
};

async function sign(raw: string, timestamp: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC", key, new TextEncoder().encode(`${timestamp}.${raw}`),
  );
  const digest = Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
  return `v1=${digest}`;
}

describe("Cakto webhook isolated simulation (no network, no database)", () => {
  it("accepts a valid timestamped HMAC and rejects tampered or expired requests", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-27T12:00:00.000Z"));
    const secret = "local-test-secret-never-used-in-production";
    const timestamp = String(Math.floor(Date.now() / 1000));
    const raw = JSON.stringify({ event: "purchase_approved", data: validOrder });
    const signature = await sign(raw, timestamp, secret);

    await expect(verifySignature(raw, timestamp, signature, secret)).resolves.toBe(true);
    await expect(verifySignature(`${raw} `, timestamp, signature, secret)).resolves.toBe(false);
    await expect(verifySignature(raw, String(Number(timestamp) - 301), signature, secret)).resolves.toBe(false);
    vi.useRealTimers();
  });

  it("accepts only the configured subscription product and paid BRL R$29.90 activations", () => {
    expect(getOrderDecision("purchase_approved", validOrder, PRODUCT_ID)?.nextStatus).toBe("authorized");
    expect(getOrderDecision("purchase_approved", { ...validOrder, status: "pending" }, PRODUCT_ID)).toBeNull();
    expect(getOrderDecision("purchase_approved", { ...validOrder, amount: 30 }, PRODUCT_ID)).toBeNull();
    expect(getOrderDecision("purchase_approved", { ...validOrder, currency: "USD" }, PRODUCT_ID)).toBeNull();
    expect(getOrderDecision("purchase_approved", validOrder, "another-product")).toBeNull();
    expect(getOrderDecision("purchase_approved", {
      ...validOrder, product: { id: PRODUCT_ID, type: "one_time" },
    }, PRODUCT_ID)).toBeNull();
  });

  it("maps cancellation, refund, chargeback and late-payment events without activating", () => {
    expect(getOrderDecision("subscription_canceled", validOrder, PRODUCT_ID)?.nextStatus).toBe("cancelled");
    expect(getOrderDecision("refund", validOrder, PRODUCT_ID)?.nextStatus).toBe("cancelled");
    expect(getOrderDecision("chargeback", validOrder, PRODUCT_ID)?.nextStatus).toBe("cancelled");
    expect(getOrderDecision("subscription_late", validOrder, PRODUCT_ID)?.nextStatus).toBe("past_due");
    expect(getOrderDecision("subscription_paused", validOrder, PRODUCT_ID)?.nextStatus).toBe("paused");
    expect(getOrderDecision("unknown_event", validOrder, PRODUCT_ID)).toBeNull();
  });

  it("links only one pending row and normalizes the customer's email", () => {
    const onlyPending = [{ id: "local-row-1" }];
    expect(selectUniquePendingRow(onlyPending)).toEqual({ id: "local-row-1" });
    expect(selectUniquePendingRow([])).toBeNull();
    expect(selectUniquePendingRow([{ id: "a" }, { id: "b" }])).toBeNull();
    expect(normalizeCustomerEmail("  TEST@Example.com ")).toBe("test@example.com");
    expect(normalizeCustomerEmail("  ")).toBeNull();
    expect(normalizeCustomerEmail("x".repeat(321))).toBeNull();
  });

  it("deduplicates the same event key and advances the period by one calendar month", () => {
    const seen = new Set<string>();
    const key = makeEventKey("purchase_approved", "test-order-001");
    expect(seen.has(key)).toBe(false);
    seen.add(key);
    expect(seen.has(key)).toBe(true);
    expect(makeEventKey("refund", "test-order-001")).not.toBe(key);
    expect(addOneMonth(new Date("2026-01-31T00:00:00.000Z")).toISOString())
      .toBe("2026-02-28T00:00:00.000Z");
  });
});
