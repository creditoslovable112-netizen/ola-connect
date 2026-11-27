import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  addOneMonth,
  getOrderDecision,
  makeEventKey,
  normalizeCustomerEmail,
  selectUniquePendingRow,
  verifySignature,
  type CaktoOrder,
} from "./logic.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
});

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const secret = Deno.env.get("CAKTO_WEBHOOK_SECRET");
    const url = Deno.env.get("SUPABASE_URL");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
    const productId = Deno.env.get("CAKTO_PRODUCT_ID");
    if (!secret || !url || !service || !productId) return json({ error: "Webhook not configured" }, 503);

    const raw = await req.text();
    const timestamp = req.headers.get("X-Cakto-Timestamp") ?? "";
    const signature = req.headers.get("X-Cakto-Signature") ?? "";
    if (!await verifySignature(raw, timestamp, signature, secret)) return json({ error: "Invalid signature" }, 401);

    const payload = JSON.parse(raw) as { secret?: string; event?: string; data?: CaktoOrder | CaktoOrder[] };
    if (payload.secret !== secret || typeof payload.event !== "string" || !payload.data) {
      return json({ error: "Invalid webhook payload" }, 400);
    }

    const orders = Array.isArray(payload.data) ? payload.data : [payload.data];
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

    for (const order of orders) {
      if (!order || typeof order !== "object" || !order.id) continue;
      const event = payload.event;
      const decision = getOrderDecision(event, order, productId);
      if (!decision) continue;
      const { isActivationEvent, nextStatus, subscriptionId } = decision;

      let existing: { id: string; user_id: string; current_period_end: string | null } | null = null;
      const { data: bySubscription, error: subscriptionLookupError } = await admin.from("user_subscriptions")
        .select("id,user_id,current_period_end")
        .eq("provider", "cakto")
        .eq("provider_subscription_id", subscriptionId)
        .limit(2);
      if (subscriptionLookupError) throw subscriptionLookupError;
      if (bySubscription && bySubscription.length > 1) {
        console.error("Multiple NEXUS subscriptions share a Cakto subscription ID");
        continue;
      }
      if (bySubscription?.length === 1) existing = bySubscription[0];

      if (!existing && isActivationEvent) {
        const email = normalizeCustomerEmail(order.customer?.email);
        if (!email) continue;
        const { data: pendingRows, error: pendingError } = await admin.from("user_subscriptions")
          .select("id,user_id,current_period_end")
          .eq("provider", "cakto")
          .eq("status", "pending")
          .ilike("payer_email", email)
          .limit(2);
        if (pendingError) throw pendingError;
        const uniquePending = selectUniquePendingRow(pendingRows);
        if (!uniquePending) {
          console.error("Cakto payment not linked: no unique pending subscription for customer email");
          continue;
        }
        existing = uniquePending;
      }

      if (!existing) continue;

      const eventKey = makeEventKey(event, order.id);
      const { error: dedupeError } = await admin.from("cakto_webhook_events")
        .insert({ event_key: eventKey, event_name: event, order_id: order.id });
      if (dedupeError) {
        if (dedupeError.code === "23505") continue;
        throw dedupeError;
      }

      const { data: plan, error: planError } = await admin.from("subscription_plans")
        .select("id").eq("slug", "pro").single();
      if (planError || !plan) throw planError ?? new Error("NEXUS PRO plan missing");

      const now = new Date();
      const existingEnd = existing.current_period_end ? new Date(existing.current_period_end) : now;
      const base = existingEnd > now ? existingEnd : now;
      const periodEnd = isActivationEvent ? addOneMonth(base) : null;
      const update = {
        user_id: existing.user_id,
        plan_id: plan.id,
        provider: "cakto",
        provider_subscription_id: subscriptionId,
        status: nextStatus,
        ...(isActivationEvent ? {
          current_period_start: now.toISOString(),
          current_period_end: periodEnd?.toISOString(),
        } : {}),
        updated_at: now.toISOString(),
        metadata: {
          provider: "cakto",
          last_event: event,
          last_order_id: order.id,
          subscription_period: order.subscription_period ?? null,
        },
      };

      const result = await admin.from("user_subscriptions").update(update).eq("id", existing.id);
      if (result.error) {
        await admin.from("cakto_webhook_events").delete().eq("event_key", eventKey);
        throw result.error;
      }
    }
    return json({ received: true });
  } catch (error) {
    console.error("cakto webhook error", error);
    return json({ error: "Webhook processing failed" }, 500);
  }
});