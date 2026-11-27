export type CaktoOrder = {
  id?: string;
  status?: string;
  amount?: number | string | null;
  currency?: string;
  paidAt?: string | null;
  customer?: { email?: string | null };
  product?: { id?: string; type?: string };
  offer?: { price?: number | string; currency?: string };
  subscription?: { id?: string; status?: string } | null;
  subscription_period?: number | null;
};

const activationEvents = new Set([
  "purchase_approved",
  "subscription_created",
  "subscription_renewed",
  "subscription_late_recovered",
  "subscription_resumed",
]);

const deactivationStatuses: Record<string, string> = {
  subscription_renewal_refused: "past_due",
  subscription_late: "past_due",
  subscription_paused: "paused",
  subscription_canceled: "cancelled",
  refund: "cancelled",
  chargeback: "cancelled",
};

export function getOrderDecision(event: string, order: CaktoOrder, expectedProductId: string) {
  if (!order.id || order.product?.id !== expectedProductId || order.product.type !== "subscription") return null;

  const isActivationEvent = activationEvents.has(event);
  const nextStatus = isActivationEvent ? "authorized" : deactivationStatuses[event];
  const subscriptionId = String(order.subscription?.id ?? "");
  if (!nextStatus || !subscriptionId) return null;

  if (isActivationEvent) {
    const paidAmount = Number(order.amount ?? order.offer?.price ?? NaN);
    const correctAmount = Number.isFinite(paidAmount)
      && Math.abs(paidAmount - 29.9) < 0.01
      && (order.currency ?? order.offer?.currency ?? "BRL") === "BRL";
    if (order.status !== "paid" || !correctAmount) return null;
  }

  return { isActivationEvent, nextStatus, subscriptionId };
}

export function normalizeCustomerEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase() ?? "";
  return normalized && normalized.length <= 320 ? normalized : null;
}

export function selectUniquePendingRow<T>(rows: readonly T[] | null | undefined): T | null {
  return rows?.length === 1 ? rows[0] ?? null : null;
}

export function makeEventKey(event: string, orderId: string): string {
  return `${event}:${orderId}`;
}

export async function verifySignature(raw: string, timestamp: string, signature: string, secret: string) {
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${raw}`));
  const digest = Array.from(new Uint8Array(signed), (b) => b.toString(16).padStart(2, "0")).join("");
  const expected = `v1=${digest}`;
  return signature.split(",").some((part) => part.trim() === expected);
}

export function addOneMonth(date: Date) {
  const next = new Date(date);
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next;
}
