import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type CaktoOrder = {
  id?: string;
  status?: string;
  amount?: number | null;
  currency?: string;
  callback?: string | null;
  paidAt?: string | null;
  product?: { id?: string; type?: string };
  offer?: { price?: number; currency?: string };
  subscription?: { id?: string; status?: string } | null;
  subscription_period?: number | null;
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
});

async function verifySignature(raw: string, timestamp: string, signature: string, secret: string) {
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

function addOneMonth(date: Date) {
  const next = new Date(date);
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next;
}

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
      if (order.product?.id !== productId || order.product?.type !== "subscription") continue;
      const callback = order.callback ?? "";
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(callback)) continue;

      const eventKey = `${payload.event}:${order.id}`;
      const { error: dedupeError } = await admin.from("cakto_webhook_events")
        .insert({ event_key: eventKey, event_name: payload.event, order_id: order.id });
      if (dedupeError) {
        if (dedupeError.code === "23505") continue;
        throw dedupeError;
      }

      const { data: plan, error: planError } = await admin.from("subscription_plans")
        .select("id,price_brl").eq("slug", "pro").single();
      if (planError || !plan) throw planError ?? new Error("NEXUS PRO plan missing");

      const paidAmount = Number(order.offer?.price ?? order.amount ?? NaN);
      const correctAmount = Number.isFinite(paidAmount) && Math.abs(paidAmount - 29.9) < 0.01
        && (order.offer?.currency ?? order.currency ?? "BRL") === "BRL";
      const subscriptionId = String(order.subscription?.id ?? "");
      const event = payload.event;
      const activates = ["purchase_approved", "subscription_created", "subscription_renewed", "subscription_late_recovered", "subscription_resumed"].includes(event)
        && order.status === "paid" && correctAmount && Boolean(subscriptionId);
      const deactivates: Record<string, string> = {
        subscription_renewal_refused: "past_due",
        subscription_late: "past_due",
        subscription_paused: "paused",
        subscription_canceled: "cancelled",
        refund: "cancelled",
        chargeback: "cancelled",
      };
      const nextStatus = activates ? "authorized" : deactivates[event];
      if (!nextStatus) continue;

      const { data: existing } = await admin.from("user_subscriptions")
        .select("id,current_period_end").eq("user_id", callback).eq("provider", "cakto")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();

      const now = new Date();
      const existingEnd = existing?.current_period_end ? new Date(existing.current_period_end) : now;
      const base = existingEnd > now ? existingEnd : now;
      const periodEnd = activates ? addOneMonth(base) : null;
      const update = {
        user_id: callback, plan_id: plan.id, provider: "cakto", provider_subscription_id: subscriptionId || null,
        status: nextStatus,
        ...(activates ? {
          current_period_start: now.toISOString(),
          current_period_end: periodEnd?.toISOString(),
        } : {}),
        updated_at: now.toISOString(),
        metadata: { provider: "cakto", last_event: event, last_order_id: order.id, subscription_period: order.subscription_period ?? null },
      };
      const result = existing
        ? await admin.from("user_subscriptions").update(update).eq("id", existing.id)
        : await admin.from("user_subscriptions").insert(update);
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