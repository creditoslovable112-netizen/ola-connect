import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const webhook = readFileSync(
  resolve(process.cwd(), "supabase/functions/cakto-webhook/index.ts"),
  "utf8",
);

describe("Cakto webhook v26 contract", () => {
  it("validates the timestamped HMAC signature before processing", () => {
    expect(webhook).toContain('req.headers.get("X-Cakto-Timestamp")');
    expect(webhook).toContain('req.headers.get("X-Cakto-Signature")');
    expect(webhook).toContain("verifySignature(raw, timestamp, signature, secret)");
    expect(webhook).toContain('return json({ error: "Invalid signature" }, 401)');
  });

  it("only accepts the configured subscription product", () => {
    expect(webhook).toContain("order.product?.id !== productId");
    expect(webhook).toContain('order.product?.type !== "subscription"');
  });

  it("requires a paid BRL purchase for the exact PRO price before activation", () => {
    expect(webhook).toContain('Math.abs(paidAmount - 29.9) < 0.01');
    expect(webhook).toContain('order.status !== "paid" || !correctAmount');
    expect(webhook).toContain('nextStatus = isActivationEvent ? "authorized"');
  });

  it("links a new purchase only to one pending Cakto row by customer email", () => {
    expect(webhook).toContain('order.customer?.email?.trim().toLowerCase()');
    expect(webhook).toContain('.eq("status", "pending")');
    expect(webhook).toContain('.ilike("payer_email", email)');
    expect(webhook).toContain("pendingRows.length !== 1");
    expect(webhook).not.toContain("order.callback");
  });

  it("deduplicates events and maps cancellation/refund states", () => {
    expect(webhook).toContain(".insert({ event_key: eventKey");
    expect(webhook).toContain('subscription_canceled: "cancelled"');
    expect(webhook).toContain('refund: "cancelled"');
    expect(webhook).toContain('chargeback: "cancelled"');
  });
});
