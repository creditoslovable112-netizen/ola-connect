import { createClient } from "npm:@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

const dateParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { year: Number(get("year")), month: Number(get("month")), day: Number(get("day")) };
};
const dateKey = (d: { year: number; month: number; day: number }) =>
  `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
const parseDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return { year, month, day };
};
const dayDiff = (a: string, b: string) => {
  const x = parseDate(a), y = parseDate(b);
  return Math.round((Date.UTC(x.year, x.month - 1, x.day) - Date.UTC(y.year, y.month - 1, y.day)) / 86400000);
};
const addMonths = (date: string, amount: number) => {
  const p = parseDate(date);
  const first = new Date(Date.UTC(p.year, p.month - 1 + amount, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return dateKey({ year: first.getUTCFullYear(), month: first.getUTCMonth() + 1, day: Math.min(p.day, lastDay) });
};
const cardDue = (year: number, month: number, day: number) => {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return dateKey({ year, month, day: Math.min(day, last) });
};

type Reminder = { userId: string; eventKey: string; entityId: string | null; title: string; body: string; url: string };

// Reuse one stateless Supabase Data API client per warm Edge Function isolate.
// This is HTTP pooling/keep-alive, not a direct PostgreSQL socket pool.
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const admin = supabaseUrl && serviceKey
  ? createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    if (!admin) return json({ error: "Server configuration missing" }, 500);

    const token = req.headers.get("x-cron-token") ?? "";
    const { data: valid, error: validationError } = await admin.rpc("validate_nexus_reminder_token", { p_token: token });
    if (validationError || valid !== true) return json({ error: "Unauthorized" }, 401);
    const now = new Date();
    const today = dateKey(dateParts(now));
    const todayPartsForHorizon = parseDate(today);
    const horizonDate = new Date(Date.UTC(todayPartsForHorizon.year, todayPartsForHorizon.month - 1, todayPartsForHorizon.day + 7));
    const horizon = dateKey({ year: horizonDate.getUTCFullYear(), month: horizonDate.getUTCMonth() + 1, day: horizonDate.getUTCDate() });
    const { data: proPlan, error: planError } = await admin.from("subscription_plans").select("id").eq("slug", "pro").maybeSingle();
    if (planError) throw planError;
    if (!proPlan) return json({ sent: 0, skipped: 0, reason: "PRO plan not configured" });

    const { data: directSubs, error: directError } = await admin.from("user_subscriptions")
      .select("user_id").eq("plan_id", proPlan.id).eq("status", "authorized")
      .lte("current_period_start", now.toISOString())
      .or(`current_period_end.gt.${now.toISOString()},and(provider.eq.manual,current_period_end.is.null)`);
    if (directError) throw directError;
    const eligible = new Set((directSubs ?? []).map((r) => r.user_id as string));

    const { data: memberships, error: memberError } = await admin.from("workspace_members")
      .select("user_id,workspace_id").eq("status", "active");
    if (memberError) throw memberError;
    const { data: workspaces, error: workspaceError } = await admin.from("workspaces")
      .select("id,owner_id");
    if (workspaceError) throw workspaceError;
    const ownerByWorkspace = new Map((workspaces ?? []).map((w) => [w.id, w.owner_id]));
    const memberOwners = [...new Set((memberships ?? []).map((m) => ownerByWorkspace.get(m.workspace_id)).filter(Boolean))] as string[];
    if (memberOwners.length) {
      const { data: ownerSubs, error: ownerError } = await admin.from("user_subscriptions")
        .select("user_id").in("user_id", memberOwners).eq("plan_id", proPlan.id).eq("status", "authorized")
        .lte("current_period_start", now.toISOString())
        .or(`current_period_end.gt.${now.toISOString()},and(provider.eq.manual,current_period_end.is.null)`);
      if (ownerError) throw ownerError;
      const proOwners = new Set((ownerSubs ?? []).map((r) => r.user_id as string));
      for (const member of memberships ?? []) {
        if (proOwners.has(ownerByWorkspace.get(member.workspace_id) ?? "")) eligible.add(member.user_id);
      }
    }
    if (!eligible.size) return json({ sent: 0, skipped: 0, reason: "No active PRO users" });

    const [prefsResult, devicesResult, businessResult, personalResult, financingResult, cardsResult] = await Promise.all([
      admin.from("notification_preferences").select("user_id,push_enabled,reminder_days,quiet_hours_start,quiet_hours_end").in("user_id", [...eligible]),
      admin.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth").in("user_id", [...eligible]),
      admin.from("transactions").select("id,user_id,description,due_date,status").in("status", ["pending", "overdue"]).not("due_date", "is", null).lte("due_date", horizon).limit(5000),
      admin.from("personal_transactions").select("id,user_id,description,due_date,status").eq("status", "pending").not("due_date", "is", null).lte("due_date", horizon).limit(5000),
      admin.from("personal_financings").select("id,user_id,name,monthly_installment,installments_total,installments_paid,first_due_date").eq("is_active", true),
      admin.from("personal_credit_cards").select("id,user_id,name,due_day").eq("is_active", true),
    ]);
    for (const result of [prefsResult, devicesResult, businessResult, personalResult, financingResult, cardsResult]) {
      if (result.error) throw result.error;
    }

    const prefs = new Map((prefsResult.data ?? []).map((p) => [p.user_id, p]));
    const devices = new Map<string, typeof devicesResult.data>();
    for (const device of devicesResult.data ?? []) devices.set(device.user_id, [...(devices.get(device.user_id) ?? []), device]);
    const reminders: Reminder[] = [];
    const addReminder = (userId: string, entityId: string, kind: string, due: string, label: string) => {
      if (!eligible.has(userId)) return;
      const pref = prefs.get(userId);
      if (pref?.push_enabled === false) return;
      const quietStart = pref?.quiet_hours_start as string | null | undefined;
      const quietEnd = pref?.quiet_hours_end as string | null | undefined;
      if (quietStart && quietEnd) {
        const scheduledTime = "09:00:00";
        const isQuiet = quietStart <= quietEnd
          ? scheduledTime >= quietStart && scheduledTime < quietEnd
          : scheduledTime >= quietStart || scheduledTime < quietEnd;
        if (isQuiet) return;
      }
      const offset = dayDiff(due, today);
      const reminderDays = Array.isArray(pref?.reminder_days) ? pref.reminder_days : [7, 3, 1, 0];
      const isOverdue = offset < 0;
      if (!isOverdue && !reminderDays.includes(offset)) return;
      const keyDate = isOverdue ? today : due;
      const eventKey = `push:${userId}:${kind}:${entityId}:${keyDate}:${isOverdue ? "overdue" : offset}`;
      reminders.push({
        userId, entityId, eventKey, title: "Lembrete financeiro · NEXUS",
        body: isOverdue ? "Você tem um compromisso financeiro em atraso. Abra o NEXUS para conferir." :
          offset === 0 ? "Você tem um compromisso financeiro com vencimento hoje." :
          `Você tem um compromisso financeiro que vence em ${offset} dia(s).`,
        url: "/",
      });
    };

    for (const row of businessResult.data ?? []) addReminder(row.user_id, row.id, "business-account", row.due_date, row.description);
    for (const row of personalResult.data ?? []) addReminder(row.user_id, row.id, "personal-account", row.due_date, row.description);
    for (const row of financingResult.data ?? []) {
      const paid = Number(row.installments_paid ?? 0), total = Number(row.installments_total ?? 0);
      if (paid >= total) continue;
      const due = addMonths(row.first_due_date, paid);
      addReminder(row.user_id, row.id, "personal-financing", due, row.name);
    }
    const todayParts = parseDate(today);
    for (const row of cardsResult.data ?? []) {
      let due = cardDue(todayParts.year, todayParts.month, Number(row.due_day));
      if (dayDiff(due, today) < 0) {
        const nextMonth = new Date(Date.UTC(todayParts.year, todayParts.month, 1));
        due = cardDue(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, Number(row.due_day));
      }
      addReminder(row.user_id, row.id, "personal-card", due, row.name);
    }

    const ready = reminders.filter((r) => (devices.get(r.userId)?.length ?? 0) > 0);
    if (!ready.length) return json({ sent: 0, skipped: reminders.length, reason: "No subscribed devices for due reminders" });

    const rawKeys = Deno.env.get("VAPID_KEYS_JSON");
    const subject = Deno.env.get("VAPID_SUBJECT");
    if (!rawKeys || !subject) return json({ error: "Push keys are not configured" }, 503);
    const vapidKeys = await webpush.importVapidKeys(JSON.parse(rawKeys), { extractable: true });
    const appServer = await webpush.ApplicationServer.new({ contactInformation: subject, vapidKeys });

    let sent = 0, skipped = 0, failed = 0;
    for (const reminder of ready) {
      const { data: existing, error: lookupError } = await admin.from("notification_dispatch_log")
        .select("id,status").eq("event_key", reminder.eventKey).maybeSingle();
      if (lookupError) throw lookupError;
      if (existing?.status === "sent") { skipped++; continue; }
      if (existing) {
        const { error } = await admin.from("notification_dispatch_log").update({ status: "queued", error_message: null })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await admin.from("notification_dispatch_log").insert({
          user_id: reminder.userId, event_key: reminder.eventKey, event_type: reminder.eventKey.split(":")[2],
          entity_id: reminder.entityId, channel: "push", status: "queued",
          metadata: { scheduled_for: today },
        });
        if (error?.code === "23505") { skipped++; continue; }
        if (error) throw error;
      }

      let delivered = 0, deviceFailures = 0;
      for (const device of devices.get(reminder.userId) ?? []) {
        try {
          const subscriber = appServer.subscribe({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } });
          await subscriber.pushTextMessage(JSON.stringify({
            title: reminder.title, body: reminder.body, tag: reminder.eventKey, url: reminder.url,
          }), { ttl: 86400, urgency: webpush.Urgency.High });
          delivered++;
        } catch (error) {
          deviceFailures++;
          if (error instanceof webpush.PushMessageError && error.isGone()) {
            await admin.from("push_subscriptions").delete().eq("id", device.id);
          }
          console.error("Push delivery failed:", error instanceof Error ? error.message : "unknown error");
        }
      }
      const status = delivered > 0 ? "sent" : "failed";
      const { error: updateError } = await admin.from("notification_dispatch_log").update({
        status, sent_at: delivered > 0 ? new Date().toISOString() : null,
        error_message: delivered > 0 ? null : "All registered devices rejected the push notification",
        metadata: { scheduled_for: today, delivered_devices: delivered, failed_devices: deviceFailures },
      }).eq("event_key", reminder.eventKey);
      if (updateError) throw updateError;
      if (delivered > 0) sent++; else failed++;
    }
    return json({ sent, skipped, failed, date: today });
  } catch (error) {
    console.error("NEXUS scheduled reminders failed:", error instanceof Error ? error.message : "unknown error");
    return json({ error: "Could not process scheduled reminders" }, 500);
  }
});