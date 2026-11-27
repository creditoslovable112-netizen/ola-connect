import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { LegalCenter } from "../components/LegalCenter";
import { SupabaseDashboard, SupabasePayables, SupabaseReceivables, SupabaseCashFlow, SupabaseAccounts, SupabaseCategories, SupabaseTransactions, SupabaseReports, SupabaseContacts, SupabaseCompanies } from "../components/SupabaseFinancialModules";
import { AuthScreen } from "../components/AuthScreen";
import { supabase } from "../lib/supabase";
import { SubscriptionManager } from "../components/SubscriptionManager";
import { NexusAI } from "../components/NexusAI";
import { NexusVoice } from "../components/NexusVoice";
import { PushNotificationSettings } from "../components/PushNotificationSettings";
import { TeamManager } from "../components/TeamManager";
import { Administration } from "../components/Administration";
import { FinancialGoals } from "../components/FinancialGoals";
import { PersonalFinance } from "../components/PersonalFinance";
import { AdvancedManagement } from "../components/AdvancedManagement";
import { BankReconciliation } from "../components/BankReconciliation";
import { listCompanies } from "../lib/finance-data";
import { recordMyConsent, listMyPrivacyConsents, COOKIE_VERSION, TERMS_VERSION, PRIVACY_VERSION } from "../lib/privacy";
import type { Session } from "@supabase/supabase-js";
import { StatsCard } from "../components/StatsCard";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity, ArrowDownLeft, ArrowUpRight, Bell, Building2, CalendarDays,
  ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Command, CreditCard,
  Download, FileBarChart, FileText, Filter, LayoutDashboard, LifeBuoy,
  Menu, MoreHorizontal, Plus, Search, Settings2, ShieldCheck, Sparkles,
  TrendingUp, Wallet, X, Users, LockKeyhole, Receipt, Landmark, CircleDollarSign, Tags, Network,
  ArrowLeftRight, Check, Clock3, Eye, EyeOff, LogOut, Target, ClipboardCheck
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
    { label: "Conciliação bancária", icon: ClipboardCheck },
  ]},
  { title: "GESTÃO", items: [
    { label: "Relatórios", icon: FileBarChart },
    { label: "Estoque", icon: Wallet },
    { label: "Contratos", icon: FileText },
    { label: "Gestão de pessoas", icon: Users },
    { label: "Aprovação de pagamentos", icon: ClipboardCheck },
    { label: "Metas financeiras", icon: Target },
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


const helpArticles = [
 { category:"Primeiros passos", question:"Como começar a usar o NEXUS FINANCE?", answer:"Entre na sua conta, cadastre sua empresa (se houver), configure suas categorias e centros de custo e depois cadastre suas contas bancárias. Em seguida, registre contas a pagar e a receber. O painel apresenta os dados que existem no seu workspace." },
 { category:"Empresas e equipe", question:"Posso gerenciar mais de uma empresa?", answer:"Sim. Cadastre cada empresa no módulo Empresas. Os registros podem ser vinculados a uma empresa específica ou compartilhados no workspace, conforme a função permitir. O seletor superior permite visualizar uma empresa ou o consolidado." },
 { category:"Empresas e equipe", question:"Como convidar alguém para minha equipe?", answer:"Acesse Equipe, informe o e-mail e escolha o papel de acesso. O convite depende da configuração de autenticação e do e-mail do projeto. Usuários existentes podem precisar entrar com o mesmo e-mail para aceitar o convite." },
 { category:"Pessoa Física", question:"Como funciona a Gestão de Pessoa Física?", answer:"Alterne para Pessoa Física no seletor do menu. Nesse ambiente você cadastra contas pessoais, receitas, despesas e financiamentos. Os dados ficam separados do workspace empresarial e disponíveis enquanto sua assinatura PRO estiver ativa." },
 { category:"Pessoa Física", question:"Como acompanho parcelas de um financiamento?", answer:"Em Pessoa Física, abra Financiamentos e cadastre o valor financiado, total do contrato, valor da parcela e quantidade. Use Registrar parcela paga para atualizar o histórico. O saldo mostrado é estimado e não substitui o saldo oficial do banco; o aplicativo não realiza o pagamento." },
 { category:"Financeiro", question:"Como cadastrar uma conta bancária?", answer:"Abra Contas bancárias e escolha Nova conta. Informe nome, banco, tipo, empresa, saldo inicial e data correspondente. Agência e número da conta são opcionais. O cadastro manual não conecta o aplicativo ao banco." },
 { category:"Financeiro", question:"Como importar um extrato bancário?", answer:"Na conta desejada, escolha Importar extrato e selecione um arquivo OFX ou CSV de até 15 MB. Confira a prévia e só então confirme. O sistema tenta reconhecer data, descrição e valor; no CSV, use cabeçalhos como Data, Descrição e Valor, ou Débito e Crédito." },
 { category:"Financeiro", question:"A importação altera o saldo da conta?", answer:"Sim. Após confirmar, as movimentações válidas são registradas como efetivadas e entram no saldo calculado. Revise o arquivo antes de confirmar e evite importar um mesmo extrato repetidamente. Lançamentos reconhecidos como duplicados são ignorados." },
 { category:"Financeiro", question:"O NEXUS conecta automaticamente ao meu banco?", answer:"Não nesta etapa. O módulo atual usa cadastro manual e importação de arquivos OFX/CSV. Conexão automática por Open Finance exigirá integração com um provedor compatível e autorização do titular." },
 { category:"Financeiro", question:"Quando uma conta a pagar ou receber altera o saldo?", answer:"O saldo considera movimentações efetivadas vinculadas à conta bancária. Um registro pendente não deve ser tratado como dinheiro já movimentado. Confira a conta selecionada ao registrar a baixa ou recebimento." },
 { category:"Financeiro", question:"Como funcionam categorias e centros de custo?", answer:"Categorias classificam receitas e despesas. Centros de custo ajudam a identificar onde o dinheiro é aplicado. Eles podem ser compartilhados no workspace ou vinculados a uma empresa, conforme o cadastro." },
 { category:"Cadastros", question:"Como cadastrar clientes e fornecedores?", answer:"Use os módulos Clientes e Fornecedores para registrar os dados de contato e associar o cadastro às empresas atendidas. Depois, selecione o cadastro correspondente nas movimentações financeiras quando aplicável." },
 { category:"Relatórios", question:"De onde vêm os números do dashboard e relatórios?", answer:"Os indicadores são calculados a partir dos registros financeiros existentes e acessíveis no seu workspace e no filtro de empresa selecionado. O aplicativo não deve preencher indicadores com movimentações de demonstração." },
 { category:"Conta e segurança", question:"Quem pode acessar os dados da minha empresa?", answer:"O acesso depende do workspace e do papel atribuído a cada membro. Convide somente pessoas autorizadas e revise os acessos da equipe periodicamente. Nunca compartilhe sua senha ou códigos de autenticação." },
 { category:"Assinatura", question:"Como consultar meu plano?", answer:"Abra Assinatura para consultar as informações do plano disponíveis na sua conta. A cobrança e a ativação de pagamentos dependem da configuração do provedor de pagamento." },
 { category:"Privacidade", question:"Como consultar os termos e a política de privacidade?", answer:"Acesse Privacidade e termos no menu da plataforma para consultar os documentos e as opções de consentimento disponíveis." },
];
function HelpCenter() {
 const [query,setQuery]=useState("");
 const [category,setCategory]=useState("Todas");
 const categories=["Todas",...Array.from(new Set(helpArticles.map(item=>item.category)))];
 const normalized=query.trim().toLocaleLowerCase("pt-BR");
 const filtered=helpArticles.filter(item=>(category==="Todas"||item.category===category)&&(!normalized||item.question.toLocaleLowerCase("pt-BR").includes(normalized)||item.answer.toLocaleLowerCase("pt-BR").includes(normalized)));
 return <section className="help-center">
  <div className="welcome-row"><div><div className="eyebrow">SUPORTE E ORIENTAÇÃO</div><h1>Central de ajuda</h1><p>Encontre respostas para usar os recursos do NEXUS FINANCE.</p></div><LifeBuoy size={30}/></div>
  <div className="panel help-search-panel"><label className="search-box"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Busque por uma dúvida ou assunto..." aria-label="Buscar artigos de ajuda"/></label>
   <div className="help-categories" aria-label="Filtrar por categoria">{categories.map(item=><button key={item} className={category===item?"help-category-active":""} onClick={()=>setCategory(item)}>{item}</button>)}</div>
   <p className="help-result-count">{filtered.length} {filtered.length===1?"resposta encontrada":"respostas encontradas"}</p>
   <div className="help-articles">{filtered.map((item,index)=><details className="help-article" key={item.question}><summary><span><small>{item.category}</small>{item.question}</span><ChevronDown size={18}/></summary><p>{item.answer}</p></details>)}
    {!filtered.length&&<div className="help-empty"><CircleHelp size={24}/><strong>Nenhuma resposta encontrada</strong><p>Tente outra palavra ou selecione “Todas” as categorias.</p><button className="button-secondary" onClick={()=>{setQuery("");setCategory("Todas");}}>Limpar busca</button></div>}
   </div>
  </div>
  <div className="panel help-footer"><strong>Não encontrou o que procurava?</strong><p>Consulte também Privacidade e termos ou volte à tela inicial do financeiro. Os canais externos de atendimento ainda não estão configurados nesta versão.</p></div>
 </section>;
}

const proFeatureModules = new Set([
  "Dashboard", "Contas a pagar", "Contas a receber", "Fluxo de caixa",
  "Transações", "Contas bancárias", "Conciliação bancária", "Relatórios", "Metas financeiras", "Categorias e centros de custo",
  "Clientes", "Fornecedores", "Empresas", "Estoque", "Contratos", "Gestão de pessoas", "Aprovação de pagamentos", "Patrimônio pessoal", "Gestão de Pessoa Física",
]);

function ProUpgradeModal({ feature, onClose, onSubscribe }: { feature: string; onClose: () => void; onSubscribe: () => void }) {
  return <div className="pro-lock-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="pro-lock-dialog" role="dialog" aria-modal="true" aria-labelledby="pro-lock-title">
      <button className="pro-lock-close icon-button" type="button" onClick={onClose} aria-label="Fechar aviso"><X size={19}/></button>
      <span className="pro-access-icon"><LockKeyhole size={25}/></span>
      <div className="eyebrow">RECURSO NEXUS PRO</div>
      <h2 id="pro-lock-title">{feature}</h2>
      <p>Esta opção está bloqueada. Ative o NEXUS PRO para liberar este recurso e os demais módulos da gestão empresarial e pessoal.</p>
      <div className="pro-lock-price">R$ 29,90 <small>/mês</small></div>
      <button className="button-primary" type="button" onClick={onSubscribe}>Ver plano e assinar <ChevronRight size={16}/></button>
      <button className="button-secondary" type="button" onClick={onClose}>Agora não</button>
    </section>
  </div>;
}

function FreeWorkspaceHome() {
  return <section className="free-workspace-home"><div className="eyebrow">SEU ESPAÇO FINANCEIRO</div><h1>Bem-vindo ao NEXUS FINANCE</h1><p>Escolha uma opção no menu para conhecer os recursos disponíveis.</p></section>;
}

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
 if (title === "NEXUS AI") return <NexusAI environment={environment} hasProAccess={hasProAccess}/>;

 if (title === "Configurações") return <section className="panel payable-list-panel"><h2>Preferências do ambiente</h2><form className="settings-form" onSubmit={async e=>{e.preventDefault();const {error}=await supabase.auth.updateUser({data:{nexus_preferences:settings}});showNotice(error?error.message:"Preferências salvas no seu perfil.")}}><label>Idioma<select value={settings.language} onChange={e=>setSettings({...settings,language:e.target.value})}><option>Português (Brasil)</option><option>English</option><option>Español</option></select></label><label>Moeda<select value={settings.currency} onChange={e=>setSettings({...settings,currency:e.target.value})}><option value="BRL">Real (BRL)</option><option value="USD">Dólar (USD)</option><option value="EUR">Euro (EUR)</option></select></label><label>Fuso horário<select value={settings.timezone} onChange={e=>setSettings({...settings,timezone:e.target.value})}><option value="America/Sao_Paulo">Brasília (America/Sao_Paulo)</option><option value="America/Manaus">Manaus (America/Manaus)</option><option value="UTC">UTC</option></select></label><label className="setting-toggle"><input type="checkbox" checked={settings.notifications} onChange={e=>setSettings({...settings,notifications:e.target.checked})}/> Receber notificações no aplicativo</label><button className="button-primary" type="submit">Salvar preferências</button><p className="demo-disclaimer">Preferências armazenadas no perfil da sua conta.</p></form><PushNotificationSettings /></section>;

 const explanations:Record<string,string> = {

  "Administração":"O painel administrativo e as ferramentas de operação ainda não estão disponíveis."
 };
 return <section className="workspace-unavailable" aria-labelledby="module-unavailable-title"><div className="eyebrow">MÓDULO NÃO DISPONÍVEL</div><h1 id="module-unavailable-title">{title}</h1><p>{explanations[title] ?? "Este módulo ainda não está disponível."}</p><span>Em preparação · Nenhuma ação ou cobrança será executada aqui.</span></section>;
}



type NexusNotification = { id: string; title: string; message: string; detail: string; tone: "success" | "warning" | "info"; goalId: string };
function NotificationCenter({ userId, enabled, hasProAccess, environment, onOpenGoals }: { userId: string; enabled: boolean; hasProAccess: boolean; environment: "business" | "personal"; onOpenGoals: () => void }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NexusNotification[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const storageKey = `nexus-notifications-read:${userId}:${environment}`;
  useEffect(() => {
    try { setReadIds(JSON.parse(window.localStorage.getItem(storageKey) || "[]") as string[]); }
    catch { setReadIds([]); }
  }, [storageKey]);
  useEffect(() => {
    let alive = true;
    if (!enabled || !hasProAccess) { setItems([]); return; }
    setLoading(true);
    void (async () => {
      try {
        const source = environment === "personal"
          ? await Promise.all([
              (supabase as any).from("personal_financial_goals").select("id,name,target_amount,current_amount,target_date"),
              (supabase as any).from("personal_transactions").select("id,description,type,amount,due_date,status").in("status", ["pending"]).not("due_date", "is", null).order("due_date", { ascending: true }).limit(100)
            ])
          : await Promise.all([
              supabase.from("financial_goals").select("id,name,target_amount,current_amount,target_date").order("target_date", { ascending: true, nullsFirst: false }),
              (supabase as any).from("transactions").select("id,description,type,amount,due_date,status").in("status", ["pending","overdue"]).not("due_date", "is", null).order("due_date", { ascending: true }).limit(100)
            ]);
        const [goalResult, transactionResult] = source;
        if (goalResult.error) throw goalResult.error;
        if (transactionResult.error) throw transactionResult.error;
        const today = new Date(); today.setHours(0,0,0,0);
        const money = (value:number) => value.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
        const generated: NexusNotification[] = [];
        for (const goal of goalResult.data ?? []) {
          const target = Number(goal.target_amount || 0), current = Number(goal.current_amount || 0);
          if (!(target > 0)) continue;
          const remaining = Math.max(0,target-current);
          if (remaining === 0) generated.push({id:`goal-complete:${goal.id}`,goalId:goal.id,tone:"success",title:`Meta concluída: ${goal.name}`,message:"Você alcançou o valor planejado.",detail:`Objetivo de ${money(target)} atingido.`});
          if (goal.target_date && remaining > 0) {
            const due = new Date(`${goal.target_date}T12:00:00`);
            const days = Math.ceil((due.getTime()-today.getTime())/86400000);
            if (days < 0 || days <= 7) generated.push({id:`goal-deadline:${goal.id}:${goal.target_date}`,goalId:goal.id,tone:days<0?"warning":"info",title:`Prazo da meta “${goal.name}”`,message:days<0?"O prazo planejado já passou.":days===0?"O prazo definido é hoje.":`Faltam ${days} dias para o prazo.`,detail:`Ainda faltam ${money(remaining)} para alcançar o objetivo.`});
          }
        }
        for (const transaction of transactionResult.data ?? []) {
          if (!transaction.due_date) continue;
          const due = new Date(`${transaction.due_date}T12:00:00`);
          const days = Math.ceil((due.getTime()-today.getTime())/86400000);
          if (days > 7) continue;
          const overdue = days < 0;
          generated.push({
            id:`transaction-due:${transaction.id}:${transaction.due_date}`,goalId:transaction.id,
            tone:overdue?"warning":"info",
            title:overdue?(transaction.type==="income"?"Recebimento em atraso":"Conta vencida"):(transaction.type==="income"?"Recebimento próximo":"Conta próxima do vencimento"),
            message:overdue?`Vencida há ${Math.abs(days)} dia(s).`:days===0?"Vence hoje.":`Vence em ${days} dia(s).`,
            detail:`${transaction.description} · ${money(Number(transaction.amount||0))}`
          });
        }
        if (alive) setItems(generated);
      } catch {
        if (alive) setItems([]);
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [enabled, hasProAccess, environment, userId]);
  const unread = items.filter(item => !readIds.includes(item.id)).length;
  const markAllRead = () => { const next=items.map(item=>item.id);setReadIds(next);window.localStorage.setItem(storageKey,JSON.stringify(next)); };
  const markRead = (id:string) => { const next=Array.from(new Set([...readIds,id]));setReadIds(next);window.localStorage.setItem(storageKey,JSON.stringify(next)); };
  return <div className="nexus-notification-wrap">
    <button className="icon-button notification-button" aria-label={`Notificações, ${unread} não lidas`} aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <Bell size={18}/>{unread>0&&<i/>}<span className="notification-count">{unread>9?"9+":unread}</span>
    </button>
    {open&&<>
      <button className="notification-dismiss-layer" aria-label="Fechar notificações" onClick={()=>setOpen(false)}/>
      <section className="nexus-notification-panel" aria-label="Central de notificações">
        <header><div><strong>Notificações</strong><small>{unread?`${unread} não lidas`:"Tudo em dia"}</small></div><button className="notification-mark-read" onClick={markAllRead} disabled={!unread}>Marcar todas como lidas</button></header>
        <div className="nexus-notification-list">
          {loading?<p className="notification-empty">Buscando vencimentos e metas…</p>:!enabled?<p className="notification-empty">Ative as notificações nas configurações.</p>:!hasProAccess?<p className="notification-empty">Ative o NEXUS PRO para acompanhar alertas financeiros.</p>:items.length===0?<p className="notification-empty">Nenhum vencimento próximo ou alerta de meta.</p>:items.map(item=><article className={`nexus-notification-item ${item.tone} ${readIds.includes(item.id)?"is-read":""}`} key={item.id}>
            <span className="notification-item-icon">{item.tone==="success"?<Check size={16}/>:item.tone==="warning"?<Clock3 size={16}/>:<Target size={16}/>}</span>
            <button className="notification-item-copy" onClick={()=>{markRead(item.id);setOpen(false);onOpenGoals();}}><strong>{item.title}</strong><span>{item.message}</span><small>{item.detail}</small></button>
            {!readIds.includes(item.id)&&<i className="notification-unread-dot"/>}
          </article>)}
        </div>
        <footer><button onClick={()=>{setOpen(false);onOpenGoals();}}>{environment==="personal"?"Ver finanças pessoais":"Ver metas e financeiro"} <ChevronRight size={15}/></button></footer>
      </section>
    </>}
  </div>;
}


function DashboardPage() {
  const [environment, setEnvironment] = useState<"business" | "personal">("business");
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [active, setActive] = useState("Dashboard");
  const [tabLoading, setTabLoading] = useState(true);
  const [proAccessLoading, setProAccessLoading] = useState(true);
  const [hasProAccess, setHasProAccess] = useState(false);
  const [period, setPeriod] = useState("Últimos 7 meses");
  const [company, setCompany] = useState("Workspace");
  const [companyOptions, setCompanyOptions] = useState<Array<{id:string;name:string}>>([]);
  const [companyScope, setCompanyScope] = useState("all");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [lockedFeature, setLockedFeature] = useState<string | null>(null);
  const [cookieBanner, setCookieBanner] = useState(false);
  const [legalStatusLoading, setLegalStatusLoading] = useState(false);
  const [needsLegalAcceptance, setNeedsLegalAcceptance] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }, []);
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
    void navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("NEXUS push service worker registration failed:", error);
    });
  }, []);
  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
      if (event === "SIGNED_OUT" || event === "USER_UPDATED") setRecoveryMode(false);
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
    let active = true;
    if (!session?.user.id) {
      setHasProAccess(false);
      setProAccessLoading(false);
      return;
    }
    setProAccessLoading(true);
    void supabase.rpc("has_active_pro_subscription").then(({ data, error }) => {
      if (!active) return;
      setHasProAccess(!error && data === true);
      setProAccessLoading(false);
    });
    return () => { active = false; };
  }, [session?.user.id, active]);

  useEffect(() => {
    setTabLoading(true);
    const timeout = window.setTimeout(() => setTabLoading(false), 420);
    return () => window.clearTimeout(timeout);
  }, [active, companyScope]);
  useEffect(() => {
    if (!session?.user.id) { setCompany("Workspace"); setCompanyOptions([]); return; }
    let active = true;
    const preferredWorkspace = window.localStorage.getItem("nexus-active-workspace");
    let workspaceQuery = (supabase as any).from("workspace_members").select("workspaces(name)")
      .eq("user_id", session.user.id).eq("status", "active");
    if (preferredWorkspace) workspaceQuery = workspaceQuery.eq("workspace_id", preferredWorkspace);
    void workspaceQuery.order("joined_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data, error }: any) => { if (active && !error && data?.workspaces?.name) setCompany(data.workspaces.name); });
    const refreshCompanyOptions = () => void listCompanies().then((rows:any[]) => {
      if (!active) return;
      setCompanyOptions(rows.map((row:any)=>({id:row.id,name:row.name})));
      const saved = window.localStorage.getItem("nexus-active-company") || "all";
      const valid = saved === "all" || rows.some((row:any)=>row.id===saved);
      const scope = valid ? saved : "all";
      setCompanyScope(scope);
      if (!valid) window.localStorage.setItem("nexus-active-company","all");
    }).catch(() => { if (active) setCompanyOptions([]); });
    window.addEventListener("nexus-companies-updated", refreshCompanyOptions);
    return () => { active = false; window.removeEventListener("nexus-companies-updated", refreshCompanyOptions); };
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


  if (authLoading) return <main className="nexus-loading-screen"><div className="nexus-loading-brand"><img src="/nexus-mark.webp" alt="" /><span><strong>NEXUS</strong><small>FINANCE</small></span></div><DashboardSkeleton /></main>;
  const inviteNeedsPassword = Boolean(session?.user.user_metadata?.["nexus_workspace_invite_id"]) && !session?.user.user_metadata?.["password_set"];
  if (!session || recoveryMode || inviteNeedsPassword) return <><AuthScreen key={inviteNeedsPassword ? "invite" : "auth"} recoveryMode={recoveryMode || inviteNeedsPassword}/>{cookieBanner && <section className="cookie-banner" role="dialog" aria-label="Preferências de cookies" aria-live="polite"><div><strong>Você controla os cookies</strong><p>O NEXUS usa armazenamento estritamente necessário para autenticação e funcionamento. Não há rastreadores opcionais ativos nesta versão. Sua escolha vale apenas para as tecnologias e finalidades descritas nesta versão; novos fornecedores ou finalidades exigirão nova avaliação e escolha.</p><a className="cookie-link" href="#privacy-signup">Saiba mais sobre privacidade</a></div><div className="cookie-actions"><button className="button-secondary" onClick={() => void saveCookieChoice("necessary")}>Rejeitar opcionais</button><button className="button-primary" onClick={() => void saveCookieChoice("all")}>Aceitar todos</button></div></section>}</>;
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
        <div className="environment-switch" role="group" aria-label="Ambiente financeiro"><button className={environment === "business" ? "environment-active" : ""} onClick={() => { setEnvironment("business"); setActive("Dashboard"); }}><Building2 size={15}/> Empresarial</button><button className={environment === "personal" ? "environment-active" : ""} onClick={() => { if (!hasProAccess) { setLockedFeature("Gestão de Pessoa Física"); return; } setEnvironment("personal"); setActive("Gestão de Pessoa Física"); }}><Users size={15}/> Pessoa Física{!hasProAccess && <LockKeyhole className="nav-lock-icon" size={13}/>}</button></div>
        <div className="workspace-switch" aria-label="Workspace atual">
          <span className="workspace-avatar"><Building2 size={17}/></span>
          <span className="workspace-copy"><strong>{environment === "personal" ? "Minha vida financeira" : company}</strong><small>{environment === "personal" ? "Ambiente pessoal privado" : "Workspace compartilhado"}</small></span>
        </div>
        <div className="sidebar-scroll">
          {(environment === "business" ? navGroups : [{ title: "FINANÇAS PESSOAIS", items: [{ label: "Gestão de Pessoa Física", icon: Wallet }, { label: "Patrimônio pessoal", icon: Landmark }] }]).map((group) => <div className="nav-group" key={group.title}>
            <p className="nav-label">{group.title}</p>
            {group.items.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${active === label ? "nav-active" : ""} ${proFeatureModules.has(label) && !hasProAccess ? "nav-item-locked" : ""}`} aria-label={proFeatureModules.has(label) && !hasProAccess ? `${label} — bloqueado no plano atual` : label} onClick={() => { setMobileOpen(false); if (proFeatureModules.has(label) && !hasProAccess) { setLockedFeature(label); return; } setActive(label); }}>
              <Icon size={17} strokeWidth={1.8}/><span>{label}</span>{proFeatureModules.has(label) && !hasProAccess && <LockKeyhole className="nav-lock-icon" size={14}/>}
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
          <button className="nav-item" onClick={() => { setActive("Central de ajuda"); setMobileOpen(false); }}><LifeBuoy size={17}/><span>Central de ajuda</span></button>
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
            {environment === "business" && companyOptions.length > 0 && <label className="company-scope-control"><Building2 size={15}/><select aria-label="Filtrar dados por empresa" value={companyScope} onChange={(e)=>{const value=e.target.value;setCompanyScope(value);window.localStorage.setItem("nexus-active-company",value);window.location.reload();}}><option value="all">Todas as empresas · Consolidado</option>{companyOptions.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
            <label className="search-box"><Search size={16}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar transações..." /><kbd>⌘ K</kbd></label>
            <button className="icon-button help-button" aria-label="Ajuda" onClick={() => setActive("Central de ajuda")}><CircleHelp size={18}/></button>
            <NotificationCenter userId={session.user.id} enabled={notificationsEnabled} hasProAccess={hasProAccess} environment={environment} onOpenGoals={() => setActive(environment === "personal" ? "Gestão de Pessoa Física" : "Metas financeiras")}/>
            <div className="top-avatar" aria-label="Perfil da conta">{(session.user.email || "NF").slice(0, 2).toUpperCase()}</div>
          </div>
        </header>

        <div className="page-content" key={companyScope} aria-busy={tabLoading || (proFeatureModules.has(active) && proAccessLoading)}>
          {tabLoading || (proFeatureModules.has(active) && proAccessLoading) ? <DashboardSkeleton /> : proFeatureModules.has(active) && !hasProAccess ? <FreeWorkspaceHome/> : active === "Central de ajuda" ? <HelpCenter/> : active === "Dashboard" ? <SupabaseDashboard showNotice={showNotice}/> : active === "Contas a pagar" ? <SupabasePayables showNotice={showNotice}/> : active === "Contas a receber" ? <SupabaseReceivables showNotice={showNotice}/> : active === "Fluxo de caixa" ? <SupabaseCashFlow showNotice={showNotice}/> : active === "Contas bancárias" ? <SupabaseAccounts showNotice={showNotice}/> : active === "Conciliação bancária" ? <BankReconciliation showNotice={showNotice}/> : active === "Categorias e centros de custo" ? <SupabaseCategories showNotice={showNotice}/> : active === "Transações" ? <SupabaseTransactions showNotice={showNotice}/> : active === "Relatórios" ? <SupabaseReports showNotice={showNotice}/> : active === "Clientes" ? <SupabaseContacts contactType="customer" showNotice={showNotice}/> : active === "Fornecedores" ? <SupabaseContacts contactType="supplier" showNotice={showNotice}/> : active === "Empresas" ? <SupabaseCompanies showNotice={showNotice}/> : active === "Equipe" ? <TeamManager showNotice={showNotice}/> : active === "Metas financeiras" ? <FinancialGoals showNotice={showNotice}/> : active === "Estoque" ? <AdvancedManagement mode="business" module="inventory" showNotice={showNotice}/> : active === "Contratos" ? <AdvancedManagement mode="business" module="contracts" showNotice={showNotice}/> : active === "Gestão de pessoas" ? <AdvancedManagement mode="business" module="people" showNotice={showNotice}/> : active === "Aprovação de pagamentos" ? <AdvancedManagement mode="business" module="approvals" showNotice={showNotice}/> : active === "Patrimônio pessoal" ? <AdvancedManagement mode="personal" module="assets" showNotice={showNotice}/> : active === "Gestão de Pessoa Física" ? <PersonalFinance showNotice={showNotice}/> : active === "Administração" ? <Administration showNotice={showNotice} onOpenTeam={() => setActive("Equipe")}/> : active === "Privacidade e termos" ? <LegalCenter onNotice={showNotice} onManageCookies={() => setCookieBanner(true)}/> : <WorkspaceModule title={active} showNotice={showNotice}/>}
        </div>
      </main>
      {notice && <div className="toast" role="status"><Check size={16}/>{notice}</div>}
      {lockedFeature && <ProUpgradeModal feature={lockedFeature} onClose={() => setLockedFeature(null)} onSubscribe={() => { setLockedFeature(null); setActive("Assinatura"); }} />}
      {session && hasProAccess && !proAccessLoading && <NexusVoice environment={environment} />}
      {cookieBanner && <section className="cookie-banner" role="dialog" aria-label="Preferências de cookies" aria-live="polite"><div><strong>Suas escolhas de privacidade</strong><p>O armazenamento necessário mantém a sessão e a segurança. Não carregamos analytics, pixels ou publicidade nesta versão. Você pode rejeitar tecnologias opcionais ou aceitar todas; marketing é uma escolha separada.</p><button className="cookie-link" onClick={() => { setActive("Privacidade e termos"); setCookieBanner(false); }}>Ler política de cookies</button></div><div className="cookie-actions"><button className="button-secondary" onClick={() => saveCookieChoice("necessary")}>Rejeitar opcionais</button><button className="button-primary" onClick={() => saveCookieChoice("all")}>Aceitar todos</button></div></section>}
    </div>
  );
}
