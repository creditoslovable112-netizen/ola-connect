import { createClient } from "npm:@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function getApplicationServer() {
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT");
  if (!publicKey || !privateKey || !subject) throw new Error("Push keys are not configured");

  const publicBytes = fromBase64Url(publicKey);
  const privateBytes = fromBase64Url(privateKey);
  if (publicBytes.length !== 65 || publicBytes[0] !== 4 || privateBytes.length !== 32) {
    throw new Error("Invalid VAPID key format");
  }

  const x = toBase64Url(publicBytes.slice(1, 33));
  const y = toBase64Url(publicBytes.slice(33, 65));
  const d = toBase64Url(privateBytes);
  const vapidKeys = await webpush.importVapidKeys({
    publicKey: { kty: "EC", crv: "P-256", x, y, ext: true, key_ops: ["verify"] },
    privateKey: { kty: "EC", crv: "P-256", x, y, d, ext: true, key_ops: ["sign"] },
  }, { extractable: true });
  return await webpush.ApplicationServer.new({ contactInformation: subject, vapidKeys });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === "config") {
      const appServer = await getApplicationServer();
      const publicKey = toBase64Url(await appServer.getVapidPublicKeyRaw());
      return json({ publicKey });
    }

    if (action !== "send-test") return json({ error: "Unsupported action" }, 400);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);
    const token = authHeader.slice(7);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) return json({ error: "Supabase environment is not configured" }, 500);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !userData.user) return json({ error: "Invalid session" }, 401);

    const { data: hasPro, error: planError } = await userClient.rpc("has_active_pro_subscription");
    if (planError || hasPro !== true) return json({ error: "NEXUS PRO is required for push notifications" }, 403);

    const { data: subscriptions, error: subscriptionsError } = await userClient
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userData.user.id);
    if (subscriptionsError) throw subscriptionsError;
    if (!subscriptions?.length) return json({ sent: 0, failed: 0, message: "No registered devices" });

    const appServer = await getApplicationServer();
    let sent = 0;
    let failed = 0;
    for (const row of subscriptions) {
      try {
        const subscriber = appServer.subscribe({
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        });
        await subscriber.pushTextMessage(JSON.stringify({
          title: "NEXUS FINANCE",
          body: "Notificações ativadas! Este é um teste de envio.",
          tag: "nexus-push-test",
          url: "/",
        }), { ttl: 60, urgency: webpush.Urgency.High, topic: "nexus-test" });
        sent += 1;
      } catch (error) {
        failed += 1;
        if (error instanceof webpush.PushMessageError && error.isGone()) {
          await userClient.from("push_subscriptions").delete().eq("id", row.id).eq("user_id", userData.user.id);
        }
        console.error("Push delivery failed for a registered device:", error instanceof Error ? error.message : "unknown error");
      }
    }
    return json({ sent, failed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected push error";
    if (message === "Push keys are not configured") {
      return json({ error: "As chaves VAPID ainda não foram configuradas no Supabase." }, 503);
    }
    console.error("NEXUS push request failed:", message);
    return json({ error: "Não foi possível processar a notificação." }, 500);
  }
});
