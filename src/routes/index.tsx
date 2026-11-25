import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { LegalCenter } from "../components/LegalCenter";
import { SupabaseDashboard, SupabasePayables, SupabaseReceivables, SupabaseCashFlow, SupabaseAccounts, SupabaseCategories, SupabaseTransactions, SupabaseReports, SupabaseContacts, SupabaseCompanies } from "../components/SupabaseFinancialModules";
import { AuthScreen } from "../components/AuthScreen";
import { supabase } from "../lib/supabase";
import { SubscriptionManager } from "../components/SubscriptionManager";
import { NexusAI } from "../components/NexusAI";
import { TeamManager } from "../components/TeamManager";
import { recordMyConsent, listMyPrivacyConsents, COOKIE_VERSION, TERMS_VERSION, PRIVACY_VERSION } from "../lib/privacy";
import type { Session } from "@supabase/supabase-js";
import { StatsCard } from "../components/StatsCard";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity, ArrowDownLeft, ArrowUpRight, Bell, Building2, CalendarDays,
  ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Command, CreditCard,
  Download, FileBarChart, FileText, Filter, LayoutDashboard, LifeBuoy,
  Menu, MoreHorizontal, Plus, Search, Settings2, ShieldCheck, Sparkles,
  TrendingUp, Wallet, X, Users, Receipt, Landmark, CircleDollarSign, Tags, Network,
  ArrowLeftRight, Check, Clock3, Eye, EyeOff, LogOut
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEXUS FINANCE — Gestão financeira inteligente" },
      { name: "description", content: "Sua gestão financeira em um só lugar." },
    ],
  }),
  component: DashboardPage,
  pendingMs: 150,
  pendingComponent: DashboardSkeleton,
});

function DashboardSkeleton() {
  return (
    <main className="nexus-skeleton" aria-label="Carregando painel" aria-busy="true">
      <div className="skeleton-heading"><div><i className="skeleton-line skeleton-eyebrow"/><i className="skeleton-line skeleton-title"/><i className="skeleton-line skeleton-subtitle"/></div><i className="skeleton-block skeleton-action"/></div>
      <div className="skeleton-metrics">{Array.from({ length: 4 }, (_, index) => <div className="skeleton-card" key={index}><i className="skeleton-line skeleton-label"/><i className="skeleton-line skeleton-value"/><i className="skeleton-line skeleton-foot"/></div>)}</div>
      <div className="skeleton-panels"><div className="skeleton-card skeleton-chart"><i className="skeleton-line skeleton-label"/><i className="skeleton-block skeleton-chart-area"/></div><div className="skeleton-card skeleton-chart"><i className="skeleton-line skeleton-label"/>{Array.from({ length: 4 }, (_, index) => <i className="skeleton-line skeleton-row" key={index}/>)}</div></div>
      <span className="skeleton-status">Preparando seu painel…</span>
    </main>
  );
}

const navGroups = [
  { title: "VISÃO GERAL", items: [{ label: "Dashboard", icon: LayoutDashboard }] },
  { title: "FINANCEIRO", items: [
    { label: "Contas a pagar", icon: ArrowUpRight },
    { label: "Contas a receber", icon: ArrowDownLeft },
    { label: "Fluxo de caixa", icon: Activity },
    { label: "Transações", icon: ArrowLeftRight },
    { label: "Contas bancárias", icon: Landmark },
  ]},
  { title: "GESTÃO", items: [
    { label: "Relatórios", icon: FileBarChart },
    { label: "Categorias e centros de custo", icon: Receipt },
    { label: "Clientes", icon: Users },
    { label: "Fornecedores", icon: Building2 },
    { label: "Empresas", icon: Building2 },
    { label: "Equipe", icon: Users },
  ]},
  { title: "PLATAFORMA", items: [
    { label: "NEXUS AI", icon: Sparkles },
    { label: "Assinatura", icon: CreditCard },
    { label: "Administração", icon: ShieldCheck },
    { label: "Configurações", icon: Settings2 },
    { label: "Privacidade e termos", icon: ShieldCheck },
  ]},
];

function WorkspaceModule({title,showNotice}:{title:string;showNotice:(message:string)=>void}) {
 const [settings,setSettings]=useState({language:"Português (Brasil)",currency:"BRL",timezone:"America/Sao_Paulo",notifications:true});
 useEffect(() => {
  if (title !== "Configurações") return;
  let active = true;
  void supabase.auth.getUser().then(({ data }) => {
   const saved = data.user?.user_metadata?.["nexus_preferences"];
   if (active && saved && typeof saved === "object") setSettings((current) => ({ ...current, ...saved as Partial<typeof current> }));
  });
  return () => { active = false; };
 }, [title]);

 if (title === "Assinatura") return <SubscriptionManager showNotice={showNotice}/>;
 if (title === "NEXUS AI") return <NexusAI/>;

 if (title === "Configurações") return <section className="panel payable-list-panel"><h2>Preferências do ambiente</h2><form className="settings-form" onSubmit={async e=>{e.preventDefault();const {error}=await supabase.auth.updateUser({data:{nexus_preferences:settings}});showNotice(error?error.message:"Preferências salvas no seu perfil.")}}><label>Idioma<select value={settings.language} onChange={e=>setSettings({...settings,language:e.target.value})}><option>Português (Brasil)</option><option>English</option><option>Español</option></select></label><label>Moeda<select value={settings.currency} onChange={e=>setSettings({...settings,currency:e.target.value})}><option value="BRL">Real (BRL)</option><option value="USD">Dólar (USD)</option><option value="EUR">Euro (EUR)</option></select></label><label>Fuso horário<select value={settings.timezone} onChange={e=>setSettings({...settings,timezone:e.target.value})}><option value="America/Sao_Paulo">Brasília (America/Sao_Paulo)</option><option value="America/Manaus">Manaus (America/Manaus)</option><option value="UTC">UTC</option></select></label><label className="setting-toggle"><input type="checkbox" checked={settings.notifications} onChange={e=>setSettings({...settings,notifications:e.target.checked})}/> Receber notificações no aplicativo</label><button className="button-primary" type="submit">Salvar preferências</button><p className="demo-disclaimer">Preferências armazenadas no perfil da sua conta.</p></form></section>;

 const explanations:Record<string,string> = {

  "Administração":"O painel administrativo e as ferramentas de operação ainda não estão disponíveis."
 };
 return <section className="workspace-unavailable" aria-labelledby="module-unavailable-title"><div className="eyebrow">MÓDULO NÃO DISPONÍVEL</div><h1 id="module-unavailable-title">{title}</h1><p>{explanations[title] ?? "Este módulo ainda não está disponível."}</p><span>Em preparação · Nenhuma ação ou cobrança será executada aqui.</span></section>;
}


function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [active, setActive] = useState("Dashboard");
  const [period, setPeriod] = useState("Últimos 7 meses");
  const [company, setCompany] = useState("Workspace");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [cookieBanner, setCookieBanner] = useState(false);
  const [legalStatusLoading, setLegalStatusLoading] = useState(false);
  const [needsLegalAcceptance, setNeedsLegalAcceptance] = useState(false);
  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }, []);
  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
      if (event === "SIGNED_OUT") setRecoveryMode(false);
      setAuthLoading(false);
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (!error) setSession(data.session);
      setAuthLoading(false);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);
  useEffect(() => { setCookieBanner(!window.localStorage.getItem("nexus-cookie-choice")); }, []);
  useEffect(() => {
    if (!session?.user.id) { setCompany("Workspace"); return; }
    let active = true;
    void (supabase as any).from("workspace_members").select("workspaces(name)")
      .eq("user_id", session.user.id).eq("status", "active").order("joined_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data, error }: any) => { if (active && !error && data?.workspaces?.name) setCompany(data.workspaces.name); });
    return () => { active = false; };
  }, [session?.user.id]);
  useEffect(() => {
    if (!session?.user.id) return;
    const choice = window.localStorage.getItem("nexus-cookie-choice");
    if (choice !== "all" && choice !== "necessary") return;
    void listMyPrivacyConsents().then((items) => {
      const latest = items.find((item) => item.purpose === "cookies");
      const granted = choice === "all";
      if (!latest || latest.granted !== granted) {
        void recordMyConsent("cookies", granted, COOKIE_VERSION, "cookie_banner_sync")
          .catch(() => showNotice("Não foi possível salvar a preferência de cookies."));
      }
    }).catch(() => showNotice("Não foi possível sincronizar a preferência de cookies com sua conta."));
  }, [session?.user.id, showNotice]);
  useEffect(() => {
    if (!session?.user.id) { setNeedsLegalAcceptance(false); setLegalStatusLoading(false); return; }
    let active = true;
    setLegalStatusLoading(true);
    void listMyPrivacyConsents().then((items) => {
      if (!active) return;
      const terms = items.find((item) => item.purpose === "terms" && item.granted && item.document_version === TERMS_VERSION);
      const privacy = items.find((item) => item.purpose === "privacy" && item.granted && item.document_version === PRIVACY_VERSION);
      setNeedsLegalAcceptance(!terms || !privacy);
    }).catch(() => {
      if (active) { setNeedsLegalAcceptance(true); showNotice("Não foi possível validar seu aceite dos documentos."); }
    }).finally(() => { if (active) setLegalStatusLoading(false); });
    return () => { active = false; };
  }, [session?.user.id, showNotice]);
  const saveCookieChoice = async (choice: "necessary" | "all") => {
    window.localStorage.setItem("nexus-cookie-choice", choice);
    if (session?.user.id) {
      try { await recordMyConsent("cookies", choice === "all", COOKIE_VERSION, "cookie_banner"); }
      catch (error) { showNotice(error instanceof Error ? error.message : "Não foi possível registrar a preferência de cookies."); }
    }
    setCookieBanner(false);
  };


  if (authLoading) return <main className="nexus-auth"><section className="auth-card"><div className="auth-brand"><div className="auth-brand-mark"><Sparkles size={22}/></div><div><strong>NEXUS</strong><span>FINANCE</span></div></div><p className="auth-intro">Verificando sua sessão segura...</p></section></main>;
  if (!session || recoveryMode) return <><AuthScreen recoveryMode={recoveryMode}/>{cookieBanner && <section className="cookie-banner" role="dialog" aria-label="Preferências de cookies" aria-live="polite"><div><strong>Você controla os cookies</strong><p>O NEXUS usa armazenamento estritamente necessário para autenticação e funcionamento. Não há rastreadores opcionais ativos nesta versão. Sua escolha vale apenas para as tecnologias e finalidades descritas nesta versão; novos fornecedores ou finalidades exigirão nova avaliação e escolha.</p><a className="cookie-link" href="#privacy-signup">Saiba mais sobre privacidade</a></div><div className="cookie-actions"><button className="button-secondary" onClick={() => void saveCookieChoice("necessary")}>Rejeitar opcionais</button><button className="button-primary" onClick={() => void saveCookieChoice("all")}>Aceitar todos</button></div></section>}</>;
  if (legalStatusLoading) return <main className="nexus-auth"><section className="auth-card"><p role="status">Verificando a versão dos documentos e seu aceite…</p></section></main>;
  if (needsLegalAcceptance) return <main className="nexus-auth"><div className="legal-gate"><LegalCenter onNotice={showNotice} onAccepted={() => setNeedsLegalAcceptance(false)} onManageCookies={() => setCookieBanner(true)}/></div>{cookieBanner && <section className="cookie-banner" role="dialog" aria-label="Preferências de cookies" aria-live="polite"><div><strong>Você controla os cookies</strong><p>O NEXUS usa armazenamento estritamente necessário para autenticação e funcionamento. Não carregamos analytics, pixels ou publicidade nesta versão. Rejeitar opcionais mantém qualquer tecnologia não essencial bloqueada.</p></div><div className="cookie-actions"><button className="button-secondary" onClick={() => void saveCookieChoice("necessary")}>Rejeitar opcionais</button><button className="button-primary" onClick={() => void saveCookieChoice("all")}>Aceitar todos</button></div></section>}{notice && <div className="toast" role="status" aria-live="polite">{notice}</div>}</main>;

  return (
    <div className="nexus-app">
      {mobileOpen && <button className="mobile-scrim" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <img className="brand-logo" src="/nexus-mark.webp" alt="Símbolo NEXUS FINANCE" />
          <div><strong>NEXUS</strong><small>FINANCE</small></div>
          <button className="mobile-close icon-button" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"><X size={18}/></button>
        </div>
        <div className="workspace-switch" aria-label="Workspace atual">
          <span className="workspace-avatar"><Building2 size={17}/></span>
          <span className="workspace-copy"><strong>{company}</strong><small>Workspace compartilhado</small></span>
        </div>
        <div className="sidebar-scroll">
          {navGroups.map((group) => <div className="nav-group" key={group.title}>
            <p className="nav-label">{group.title}</p>
            {group.items.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${active === label ? "nav-active" : ""}`} onClick={() => { setActive(label); setMobileOpen(false); }}>
              <Icon size={17} strokeWidth={1.8}/><span>{label}</span>
            </button>)}
          </div>)}
          <div className="sidebar-promo">
            <div className="promo-icon"><Sparkles size={17}/></div>
            <strong>Conheça o Nexus IA</strong>
            <p>Insights inteligentes para decisões melhores.</p>
            <button onClick={() => showNotice("Nexus IA estará disponível em uma próxima etapa.")}>Explorar recurso <ArrowUpRight size={14}/></button>
          </div>
        </div>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => showNotice("Central de ajuda ainda não está disponível.")}><LifeBuoy size={17}/><span>Central de ajuda</span></button>
          <button className="nav-item" onClick={() => setActive("Configurações")}><Settings2 size={17}/><span>Configurações</span></button>
          <div className="profile">
            <div className="profile-avatar">{(session.user.email || "NF").slice(0, 2).toUpperCase()}</div>
            <div className="profile-copy"><strong>{String(session.user.user_metadata?.["full_name"] || session.user.email?.split("@")[0] || "Minha conta")}</strong><small>{session.user.email}</small></div>
            <button className="profile-signout" title="Sair da conta" aria-label="Sair da conta" onClick={() => { void supabase.auth.signOut().then(({ error }) => { if (error) showNotice(error.message); }); }}><LogOut size={16}/></button>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Menu size={20}/></button>
            <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14}/><strong>{active}</strong></div>
          </div>
          <div className="topbar-actions">
            <label className="search-box"><Search size={16}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar transações..." /><kbd>⌘ K</kbd></label>
            <button className="icon-button help-button" aria-label="Ajuda" onClick={() => showNotice("Central de ajuda em breve.")}><CircleHelp size={18}/></button>
            <button className="icon-button notification-button" aria-label="Notificações" onClick={() => showNotice("Central de notificações ainda não está disponível.")}><Bell size={18}/><i/></button>
            <div className="top-avatar" aria-label="Perfil da conta">{(session.user.email || "NF").slice(0, 2).toUpperCase()}</div>
          </div>
        </header>

        <div className="page-content">
          {active === "Dashboard" ? <SupabaseDashboard showNotice={showNotice}/> : active === "Contas a pagar" ? <SupabasePayables showNotice={showNotice}/> : active === "Contas a receber" ? <SupabaseReceivables showNotice={showNotice}/> : active === "Fluxo de caixa" ? <SupabaseCashFlow showNotice={showNotice}/> : active === "Contas bancárias" ? <SupabaseAccounts showNotice={showNotice}/> : active === "Categorias e centros de custo" ? <SupabaseCategories showNotice={showNotice}/> : active === "Transações" ? <SupabaseTransactions showNotice={showNotice}/> : active === "Relatórios" ? <SupabaseReports showNotice={showNotice}/> : active === "Clientes" ? <SupabaseContacts contactType="customer" showNotice={showNotice}/> : active === "Fornecedores" ? <SupabaseContacts contactType="supplier" showNotice={showNotice}/> : active === "Empresas" ? <SupabaseCompanies showNotice={showNotice}/> : active === "Equipe" ? <TeamManager showNotice={showNotice}/> : active === "Privacidade e termos" ? <LegalCenter onNotice={showNotice} onManageCookies={() => setCookieBanner(true)}/> : <WorkspaceModule title={active} showNotice={showNotice}/>}
        </div>
      </main>
      {notice && <div className="toast" role="status"><Check size={16}/>{notice}</div>}
      {cookieBanner && <section className="cookie-banner" role="dialog" aria-label="Preferências de cookies" aria-live="polite"><div><strong>Suas escolhas de privacidade</strong><p>O armazenamento necessário mantém a sessão e a segurança. Não carregamos analytics, pixels ou publicidade nesta versão. Você pode rejeitar tecnologias opcionais ou aceitar todas; marketing é uma escolha separada.</p><button className="cookie-link" onClick={() => { setActive("Privacidade e termos"); setCookieBanner(false); }}>Ler política de cookies</button></div><div className="cookie-actions"><button className="button-secondary" onClick={() => saveCookieChoice("necessary")}>Rejeitar opcionais</button><button className="button-primary" onClick={() => saveCookieChoice("all")}>Aceitar todos</button></div></section>}
    </div>
  );
}
