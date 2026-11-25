import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  const url = Deno.env.get("SUPABASE_URL")!, anonKey = Deno.env.get("SUPABASE_ANON_KEY")!, serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Sessão não informada." }, 401);
  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: authData, error: authError } = await caller.auth.getUser();
  if (authError || !authData.user) return json({ error: "Sessão inválida." }, 401);
  const user = authData.user, admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  try {
    const body = await req.json(), action = String(body.action ?? "");
    if (action === "accept") {
      const { data: invites, error } = await admin.from("workspace_invites").select("*")
        .eq("email", (user.email ?? "").toLowerCase()).eq("status", "pending").gt("expires_at", new Date().toISOString());
      if (error) throw error;
      for (const invite of invites ?? []) {
        const { error: memberError } = await admin.from("workspace_members").upsert({ workspace_id: invite.workspace_id, user_id: user.id, role: invite.role, status: "active" }, { onConflict: "workspace_id,user_id" });
        if (memberError) throw memberError;
        const { error: updateError } = await admin.from("workspace_invites").update({ status: "accepted" }).eq("id", invite.id);
        if (updateError) throw updateError;
      }
      return json({ accepted: invites?.length ?? 0 });
    }
    const workspaceId = String(body.workspace_id ?? "");
    if (!workspaceId) return json({ error: "Workspace obrigatório." }, 400);
    const { data: membership, error: membershipError } = await admin.from("workspace_members").select("role")
      .eq("workspace_id", workspaceId).eq("user_id", user.id).eq("status", "active").maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) return json({ error: "Você não faz parte deste workspace." }, 403);
    if (action === "list") {
      const { data: members, error } = await admin.from("workspace_members").select("id,user_id,role,status,joined_at")
        .eq("workspace_id", workspaceId).order("joined_at");
      if (error) throw error;
      const { data: invites, error: inviteError } = await admin.from("workspace_invites")
        .select("id,email,role,status,expires_at,created_at").eq("workspace_id", workspaceId)
        .eq("status", "pending").order("created_at", { ascending: false });
      if (inviteError) throw inviteError;
      const { data: users, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (usersError) throw usersError;
      const emailById = new Map((users.users ?? []).map((u) => [u.id, u.email]));
      return json({ members: (members ?? []).map((m) => ({ ...m, email: emailById.get(m.user_id) ?? null })), invites: invites ?? [] });
    }
    if (!["owner", "admin"].includes(membership.role)) return json({ error: "Somente proprietários e administradores podem gerenciar a equipe." }, 403);
    if (action === "invite") {
      const email = String(body.email ?? "").trim().toLowerCase(), role = String(body.role ?? "editor");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Informe um e-mail válido." }, 400);
      if (!["admin", "editor", "viewer"].includes(role)) return json({ error: "Permissão inválida." }, 400);
      if (email === (user.email ?? "").toLowerCase()) return json({ error: "Você já é membro deste workspace." }, 400);
      const { data: existing, error: existingError } = await admin.from("workspace_invites").select("id")
        .eq("workspace_id", workspaceId).eq("email", email).eq("status", "pending").maybeSingle();
      if (existingError) throw existingError;
      if (existing) return json({ error: "Já existe um convite pendente para este e-mail." }, 409);
      const { data: invite, error: insertError } = await admin.from("workspace_invites").insert({ workspace_id: workspaceId, email, role, invited_by: user.id }).select().single();
      if (insertError) throw insertError;
      let emailSent = false, message = "Convite registrado. Se a pessoa já tem conta, entre no NEXUS com esse mesmo e-mail para aceitar.";
      const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { data: { nexus_workspace_invite_id: invite.id }, redirectTo: Deno.env.get("NEXUS_APP_URL") ?? undefined });
      if (!inviteError) { emailSent = true; message = "Convite enviado por e-mail."; }
      else if (!String(inviteError.message).toLowerCase().includes("already") && !String(inviteError.message).toLowerCase().includes("registered")) {
        await admin.from("workspace_invites").delete().eq("id", invite.id); throw inviteError;
      }
      return json({ invite: { id: invite.id, email, role }, email_sent: emailSent, message });
    }
    if (action === "revoke_invite") {
      const { error } = await admin.from("workspace_invites").update({ status: "revoked" }).eq("workspace_id", workspaceId).eq("id", String(body.invite_id)).eq("status", "pending");
      if (error) throw error; return json({ success: true });
    }
    if (action === "change_role") {
      const targetId = String(body.user_id ?? ""), role = String(body.role ?? "");
      if (!["admin", "editor", "viewer"].includes(role)) return json({ error: "Permissão inválida." }, 400);
      if (targetId === user.id) return json({ error: "Não é possível alterar sua própria permissão." }, 400);
      const { error } = await admin.from("workspace_members").update({ role }).eq("workspace_id", workspaceId).eq("user_id", targetId).neq("role", "owner");
      if (error) throw error; return json({ success: true });
    }
    if (action === "remove_member") {
      const targetId = String(body.user_id ?? "");
      if (targetId === user.id) return json({ error: "Não é possível remover sua própria conta." }, 400);
      const { error } = await admin.from("workspace_members").delete().eq("workspace_id", workspaceId).eq("user_id", targetId).neq("role", "owner");
      if (error) throw error; return json({ success: true });
    }
    return json({ error: "Ação desconhecida." }, 400);
  } catch (error) {
    console.error("team-management", error);
    return json({ error: error instanceof Error ? error.message : "Erro interno ao gerenciar equipe." }, 500);
  }
});