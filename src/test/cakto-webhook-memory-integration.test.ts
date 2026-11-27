import { describe, expect, it } from "vitest";
import {
  addOneMonth,
  getOrderDecision,
  makeEventKey,
  normalizeCustomerEmail,
  selectUniquePendingRow,
  type CaktoOrder,
} from "../../supabase/functions/cakto-webhook/logic";

type SubscriptionRow = {
  id: string;
  user_id: string;
  provider: "cakto";
  status: string;
  payer_email: string;
  provider_subscription_id: string | null;
  current_period_end: string | null;
};

type EventRow = { event_key: string; order_id: string; event_name: string };

function createMemoryStore(initialRows: SubscriptionRow[]) {
  const subscriptions = structuredClone(initialRows);
  const events: EventRow[] = [];

  function process(event: string, order: CaktoOrder, expectedProductId: string, now: Date) {
    const decision = getOrderDecision(event, order, expectedProductId);
    if (!decision || !order.id) return "ignored";

    let row = subscriptions.find((item) =>
      item.provider === "cakto" && item.provider_subscription_id === decision.subscriptionId
    );

    if (!row && decision.isActivationEvent) {
      const email = normalizeCustomerEmail(order.customer?.email);
      if (!email) return "unmatched";
      const candidates = subscriptions.filter((item) =>
        item.provider === "cakto" && item.status === "pending"
        && normalizeCustomerEmail(item.payer_email) === email
      );
      row = selectUniquePendingRow(candidates) ?? undefined;
      if (!row) return "unmatched";
    }
    if (!row) return "unmatched";

    const eventKey = makeEventKey(event, order.id);
    if (events.some((item) => item.event_key === eventKey)) return "duplicate";
    events.push({ event_key: eventKey, order_id: order.id, event_name: event });

    if (decision.isActivationEvent) {
      const currentEnd = row.current_period_end ? new Date(row.current_period_end) : now;
      const base = currentEnd > now ? currentEnd : now;
      row.current_period_end = addOneMonth(base).toISOString();
      row.provider_subscription_id = decision.subscriptionId;
    }
    row.status = decision.nextStatus;
    return "updated";
  }

  return { subscriptions, events, process };
}

const productId = "isolated-test-product";
const paidOrder: CaktoOrder = {
  id: "isolated-order-1",
  status: "paid",
  amount: 29.9,
  currency: "BRL",
  product: { id: productId, type: "subscription" },
  subscription: { id: "isolated-subscription-1" },
  customer: { email: " TEST@example.com " },
};
const pendingRow = (): SubscriptionRow => ({
  id: "local-subscription-row",
  user_id: "fake-user-only",
  provider: "cakto",
  status: "pending",
  payer_email: "test@example.com",
  provider_subscription_id: null,
  current_period_end: null,
});

describe("Cakto mocked repository integration (memory only)", () => {
  it("links one pending user row and activates it for a valid paid event", () => {
    const store = createMemoryStore([pendingRow()]);
    const result = store.process("purchase_approved", paidOrder, productId, new Date("2026-11-27T12:00:00Z"));

    expect(result).toBe("updated");
    expect(store.subscriptions[0]).toMatchObject({
      id: "local-subscription-row",
      user_id: "fake-user-only",
      status: "authorized",
      provider_subscription_id: "isolated-subscription-1",
    });
    expect(store.subscriptions[0].current_period_end).toBe("2026-12-27T12:00:00.000Z");
    expect(store.events).toHaveLength(1);
  });

  it("does not update ambiguous pending rows and does not apply the same event twice", () => {
    const ambiguous = createMemoryStore([pendingRow(), { ...pendingRow(), id: "second-row" }]);
    expect(ambiguous.process("purchase_approved", paidOrder, productId, new Date())).toBe("unmatched");
    expect(ambiguous.subscriptions.every((row) => row.status === "pending")).toBe(true);
    expect(ambiguous.events).toHaveLength(0);

    const store = createMemoryStore([pendingRow()]);
    const now = new Date("2026-11-27T12:00:00Z");
    expect(store.process("purchase_approved", paidOrder, productId, now)).toBe("updated");
    expect(store.process("purchase_approved", paidOrder, productId, now)).toBe("duplicate");
    expect(store.events).toHaveLength(1);
    expect(store.subscriptions[0].status).toBe("authorized");
  });

  it("applies cancellation to the linked subscription without extending its period", () => {
    const row = {
      ...pendingRow(),
      status: "authorized",
      provider_subscription_id: "isolated-subscription-1",
      current_period_end: "2026-12-27T12:00:00.000Z",
    };
    const store = createMemoryStore([row]);
    const before = store.subscriptions[0].current_period_end;
    const result = store.process("subscription_canceled", paidOrder, productId, new Date("2026-11-27T12:00:00Z"));

    expect(result).toBe("updated");
    expect(store.subscriptions[0].status).toBe("cancelled");
    expect(store.subscriptions[0].current_period_end).toBe(before);
    expect(store.events).toHaveLength(1);
  });
});
