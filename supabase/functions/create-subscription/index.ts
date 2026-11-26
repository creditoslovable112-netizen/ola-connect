import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const appUrl = Deno.env.get("NEXUS_APP_URL") ?? "";
const cors = {
  "Access-Control-Allow-Origin": appUrl || "null",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Faça login para assinar o NEXUS PRO." }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
    const checkoutBase = Deno.env.get("CAKTO_CHECKOUT_URL");
    if (!url || !anon || !service || !checkoutBase || !appUrl) {
      return json({ error: "Integração Cakto pendente. Configure CAKTO_CHECKOUT_URL e NEXUS_APP_URL nos Secrets do Supabase." }, 503);
    }

    const checkoutUrl = new URL(checkoutBase);
    if (checkoutUrl.protocol !== "https:" || checkoutUrl.hostname !== "pay.cakto.com.br") {
      return json({ error: "CAKTO_CHECKOUT_URL deve ser um link HTTPS oficial pay.cakto.com.br." }, 503);
    }

    const auth = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user }, error: authError } = await auth.auth.getUser(token);
    if (authError || !user?.email) return json({ error: "Sessão inválida ou e-mail não confirmado." }, 401);

    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: plan, error: planError } = await admin.from("subscription_plans")
      .select("id,slug,price_brl").eq("slug", "pro").eq("is_active", true).single();
    if (planError || !plan || Number(plan.price_brl) !== 29.9) {
      return json({ error: "O plano NEXUS PRO não está configurado corretamente." }, 503);
    }

    const { data: active } = await admin.from("user_subscriptions")
      .select("id,status").eq("user_id", user.id).eq("provider", "cakto")
      .eq("status", "authorized").gt("current_period_end", new Date().toISOString())
      .limit(1).maybeSingle();
    if (active) return json({ error: "Sua assinatura NEXUS PRO já está ativa." }, 409);

    const target = new URL(checkoutUrl.toString());
    target.searchParams.set("callback", user.id);

    const { data: pending } = await admin.from("user_subscriptions")
      .select("id").eq("user_id", user.id).eq("provider", "cakto")
      .eq("status", "pending").order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (pending) {
      const { error } = await admin.from("user_subscriptions").update({
        plan_id: plan.id, payer_email: user.email, checkout_url: target.toString(),
        metadata: { provider: "cakto", plan_slug: "pro", expected_amount_brl: 29.9 },
        updated_at: new Date().toISOString(),
      }).eq("id", pending.id);
      if (error) throw error;
    } else {
      const { error } = await admin.from("user_subscriptions").insert({
        user_id: user.id, plan_id: plan.id, status: "pending", provider: "cakto",
        payer_email: user.email, checkout_url: target.toString(),
        metadata: { provider: "cakto", plan_slug: "pro", expected_amount_brl: 29.9 },
      });
      if (error) throw error;
    }

    return json({ checkout_url: target.toString() });
  } catch (error) {
    console.error("cakto checkout error", error);
    return json({ error: "Não foi possível iniciar o checkout. Tente novamente." }, 500);
  }
});