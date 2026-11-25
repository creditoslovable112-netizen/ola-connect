import { useCallback, useEffect, useState } from "react";
import { Activity, Building2, Clock3, KeyRound, RefreshCw, ShieldCheck, Users, LogOut, Save } from "lucide-react";
import { supabase } from "../lib/supabase";

type Workspace = {
  id: string; name: string; owner_id: string; role: "owner" | "admin" | "editor" | "viewer";
  currency: "BRL" | "USD" | "EUR"; timezone: string; created_at: string;
};
type AuditEntry = {
  id: string; actor_user_id: string | null; action: string; table_name: string;
  record_id: string | null; company_id: string | null; changed_fields: string[];
  source: string; created_at: string;
};
type Props = { showNotice: (message: string) => void; onOpenTeam: () => void };
const actionLabels: Record<string,string> = {
  INSERT: "Registro criado", UPDATE: "Registro atualizado", DELETE: "Registro excluído",
  INVITE: "Convite enviado", REVOKE_INVITE: "Convite revogado", ROLE_CHANGED: "Permissão alterada",
  MEMBER_REMOVED: "Membro removido", SESSION_REVOKED: "Sessões encerradas", SETTINGS_UPDATED: "Configurações alteradas",
};
const tableLabels: Record<string,string> = {
  transactions: "Transações", financial_accounts: "Contas bancárias", companies: "Empresas",
  categories: "Categorias", cost_centers: "Centros de custo", business_contacts: "Clientes/fornecedores",
  workspace_members: "Equipe", workspace_invites: "Convites", workspaces: "Workspace",
};
const dateTime = (value: string) => new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function Administration({ showNotice, onOpenTeam }: Props) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [mfaCount, setMfaCount] = useState<number | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<"BRL"|"USD"|"EUR">("BRL");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const selected = workspaces.find(w => w.id === workspaceId);
  const canAdmin = selected?.role === "owner" || selected?.role === "admin";

  const load = useCallback(async (target?: string) => {
    setLoading(true);
    try {
      const [{ data: userData, error: userError }, { data: sessionData }] = await Promise.all([
        supabase.auth.getUser(), supabase.auth.getSession()
      ]);
      if (userError || !userData.user) throw userError ?? new Error("Faça login novamente.");
      setUserId(userData.user.id);
      setEmail(userData.user.email ?? "");
      setLastSignIn(userData.user.last_sign_in_at ?? null);
      setExpiresAt(sessionData.session?.expires_at ?? null);
      const { data: factors } = await supabase.auth.mfa.listFactors();
      setMfaCount((factors?.all ?? []).filter(f => f.status === "verified").length);
      const { data: memberships, error } = await (supabase as any).from("workspace_members")
        .select("workspace_id,role,workspaces(id,name,owner_id,currency,timezone,created_at)")
        .eq("user_id", userData.user.id).eq("status", "active").order("joined_at", { ascending: true });
      if (error) throw error;
      const mapped = (memberships ?? []).map((m: any) => ({
        ...m.workspaces, role: m.role
      })).filter((w: any) => w.id) as Workspace[];
      setWorkspaces(mapped);
      const nextId = target && mapped.some(w => w.id === target) ? target : (mapped[0]?.id ?? "");
      setWorkspaceId(nextId);
      const current = mapped.find(w => w.id === nextId);
      if (current) {
        setName(current.name);
        setCurrency(current.currency ?? "BRL");
        setTimezone(current.timezone ?? "America/Sao_Paulo");
      }
      if (nextId && (current?.role === "owner" || current?.role === "admin")) {
        const { data: logs, error: auditError } = await (supabase as any).from("workspace_audit_logs")
          .select("id,actor_user_id,action,table_name,record_id,company_id,changed_fields,source,created_at")
          .eq("workspace_id", nextId).order("created_at", { ascending: false }).limit(100);
        if (auditError) throw auditError;
        setAudit((logs ?? []) as AuditEntry[]);
      } else setAudit([]);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Não foi possível carregar a administração.");
    } finally { setLoading(false); }
  }, [showNotice]);

  useEffect(() => { void load(); }, [load]);

  const saveWorkspace = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!workspaceId || !canAdmin) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("workspaces")
        .update({ name: name.trim(), currency, timezone, updated_by: userId })
        .eq("id", workspaceId);
      if (error) throw error;
      showNotice("Configurações do workspace salvas.");
      await load(workspaceId);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Não foi possível salvar as configurações.");
    } finally { setSaving(false); }
  };

  const signOutEverywhere = async () => {
    if (!window.confirm("Isso encerrará todas as sessões da sua conta, inclusive esta. Deseja continuar?")) return;
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) showNotice(error.message);
  };

  const visibleAudit = audit.filter(entry => filter === "all" || entry.action === filter);
  const activeMembers = workspaces.length ? "Workspace conectado" : "Sem workspace";

  return <div className="admin-page" style={{ display: "grid", gap: 18 }}>
    <div className="welcome-row">
      <div><div className="eyebrow">CONTROLE E GOVERNANÇA</div><h1>Administração</h1><p>Segurança, configurações e rastreabilidade do seu workspace.</p></div>
      <button className="button-secondary" onClick={() => void load(workspaceId)} disabled={loading}><RefreshCw size={15}/> Atualizar</button>
    </div>
    {loading ? <section className="panel">Carregando informações administrativas reais…</section> : !workspaces.length ?
      <section className="panel"><h2>Nenhum workspace disponível</h2><p>Esta conta ainda não possui um workspace ativo.</p></section> : <>
      {workspaces.length > 1 && <label className="team-workspace-select"><Building2 size={16}/> Workspace
        <select value={workspaceId} onChange={e => void load(e.target.value)}>{workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
      </label>}
      <div className="team-summary-grid">
        <article className="metric-card"><div className="metric-top">Seu perfil <ShieldCheck size={17}/></div><div className="metric-value team-role-value">{selected?.role ?? "—"}</div><div className="metric-foot">{email}</div></article>
        <article className="metric-card"><div className="metric-top">Auditoria <Activity size={17}/></div><div className="metric-value">{audit.length}</div><div className="metric-foot">Eventos recentes disponíveis</div></article>
        <article className="metric-card"><div className="metric-top">Autenticação multifator <KeyRound size={17}/></div><div className="metric-value">{mfaCount === null ? "—" : mfaCount > 0 ? "Ativa" : "Inativa"}</div><div className="metric-foot">{mfaCount === null ? "Status não disponível" : mfaCount > 0 ? "Fator verificado na conta" : "Nenhum fator verificado"}</div></article>
      </div>
      {!canAdmin && <section className="panel"><h2>Acesso administrativo restrito</h2><p>Seu papel atual permite consultar o workspace, mas somente proprietários e administradores podem visualizar a auditoria e alterar configurações.</p></section>}
      {canAdmin && <>
        <section className="panel" style={{ display: "grid", gap: 14 }}>
          <div><h2>Configurações do workspace</h2><p>Essas preferências são compartilhadas pelos membros deste espaço de trabalho.</p></div>
          <form className="settings-form" onSubmit={saveWorkspace}>
            <label>Nome do workspace<input value={name} onChange={e => setName(e.target.value)} required maxLength={100}/></label>
            <label>Moeda padrão<select value={currency} onChange={e => setCurrency(e.target.value as typeof currency)}><option value="BRL">Real brasileiro (BRL)</option><option value="USD">Dólar (USD)</option><option value="EUR">Euro (EUR)</option></select></label>
            <label>Fuso horário<select value={timezone} onChange={e => setTimezone(e.target.value)}><option value="America/Sao_Paulo">Brasília / São Paulo</option><option value="America/Manaus">Manaus</option><option value="America/Belem">Belém</option><option value="America/Fortaleza">Fortaleza</option><option value="UTC">UTC</option></select></label>
            <button className="button-primary" type="submit" disabled={saving}><Save size={15}/>{saving ? "Salvando…" : "Salvar configurações"}</button>
          </form>
          <p className="demo-disclaimer">Workspace criado em {selected?.created_at ? new Date(selected.created_at).toLocaleDateString("pt-BR") : "—"}. As alterações ficam registradas na auditoria.</p>
        </section>
        <section className="panel" style={{ display: "grid", gap: 14 }}>
          <div className="team-list-heading"><div><h2>Equipe e permissões</h2><p>Gerencie convites, membros e papéis de acesso.</p></div><button className="button-secondary" onClick={onOpenTeam}><Users size={15}/> Gerenciar equipe</button></div>
        </section>
        <section className="panel" style={{ display: "grid", gap: 14 }}>
          <div><h2>Registro de auditoria</h2><p>Eventos reais capturados no banco. O histórico registra ações e campos alterados, sem copiar valores financeiros ou dados pessoais para o log.</p></div>
          <label>Filtrar eventos<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Todos os eventos</option><option value="INSERT">Criações</option><option value="UPDATE">Alterações</option><option value="DELETE">Exclusões</option><option value="ROLE_CHANGED">Permissões</option><option value="MEMBER_REMOVED">Remoções de membros</option><option value="INVITE">Convites</option></select></label>
          <div style={{ display: "grid", gap: 0 }}>
            {visibleAudit.map(entry => <div key={entry.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "center", padding: "13px 0", borderTop: "1px solid var(--border, rgba(128,128,128,.2))" }}>
              <div style={{ minWidth: 0 }}>
                <strong>{actionLabels[entry.action] ?? entry.action} · {tableLabels[entry.table_name] ?? entry.table_name}</strong>
                <div className="demo-disclaimer">{entry.actor_user_id === userId ? "Você" : entry.actor_user_id ? "Membro " + entry.actor_user_id.slice(0,8) : "Ação via integração"} · {entry.changed_fields?.length ? entry.changed_fields.join(", ") : "Sem campos detalhados"}</div>
              </div>
              <span className="demo-disclaimer" style={{ whiteSpace: "nowrap" }}><Clock3 size={13}/> {dateTime(entry.created_at)}</span>
            </div>)}
            {!visibleAudit.length && <p className="demo-disclaimer">Nenhum evento registrado para este workspace no período disponível.</p>}
          </div>
        </section>
      </>}
      <section className="panel" style={{ display: "grid", gap: 12 }}>
        <div><h2>Sessão e segurança da conta</h2><p>Informações da sessão autenticada e controle de encerramento de sessões da sua própria conta.</p></div>
        <div className="team-member-row"><div className="team-member-avatar"><ShieldCheck size={17}/></div><div className="team-member-copy"><strong>{email}</strong><small>Último acesso: {lastSignIn ? dateTime(lastSignIn) : "Não informado"}</small></div></div>
        <p className="demo-disclaimer">Sessão atual expira: {expiresAt ? dateTime(new Date(expiresAt * 1000).toISOString()) : "Não disponível"}. Para revogar acessos de um colaborador, remova-o da equipe; a autorização no banco deixa de reconhecê-lo.</p>
        <button className="button-secondary" onClick={() => void signOutEverywhere()}><LogOut size={15}/> Encerrar todas as minhas sessões</button>
      </section>
      <p className="demo-disclaimer"><ShieldCheck size={14}/> {activeMembers}. A auditoria registra metadados de alterações; não armazena conteúdo de transações, senhas, tokens ou arquivos.</p>
    </>}
  </div>;
}
