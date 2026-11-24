import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity, ArrowDownLeft, ArrowUpRight, Bell, Building2, CalendarDays,
  ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Command, CreditCard,
  Download, FileBarChart, FileText, Filter, LayoutDashboard, LifeBuoy,
  Menu, MoreHorizontal, Plus, Search, Settings2, ShieldCheck, Sparkles,
  TrendingUp, Wallet, X, Users, Receipt, Landmark, CircleDollarSign,
  ArrowLeftRight, Check, Clock3, Eye, EyeOff
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
});

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
    { label: "Categorias", icon: Receipt },
    { label: "Equipe", icon: Users },
  ]},
];

const cashData = [
  { month: "Mai", entradas: 38500, saidas: 24200 },
  { month: "Jun", entradas: 42800, saidas: 28600 },
  { month: "Jul", entradas: 39800, saidas: 25100 },
  { month: "Ago", entradas: 51200, saidas: 31400 },
  { month: "Set", entradas: 47600, saidas: 30200 },
  { month: "Out", entradas: 58400, saidas: 34800 },
  { month: "Nov", entradas: 64200, saidas: 38200 },
];

const transactions = [
  { name: "Projeto identidade visual", detail: "Studio Aurora · Serviços", date: "Hoje, 10:42", category: "Prestação de serviço", amount: "+ R$ 8.500,00", type: "in", initials: "SA", color: "lavender" },
  { name: "Aluguel do escritório", detail: "Imobiliária Horizonte", date: "Hoje, 09:18", category: "Infraestrutura", amount: "− R$ 3.200,00", type: "out", initials: "IH", color: "peach" },
  { name: "Assinatura plataforma", detail: "Software & tecnologia", date: "Ontem, 16:30", category: "Tecnologia", amount: "− R$ 489,90", type: "out", initials: "SP", color: "blue" },
  { name: "Consultoria empresarial", detail: "Grupo Monteiro", date: "Ontem, 14:05", category: "Consultoria", amount: "+ R$ 12.000,00", type: "in", initials: "GM", color: "mint" },
];

const formatCurrency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function DashboardPage() {
  const [active, setActive] = useState("Dashboard");
  const [period, setPeriod] = useState("Últimos 7 meses");
  const [company, setCompany] = useState("Nexus Studio");
  const [companyOpen, setCompanyOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const filteredTransactions = useMemo(() => transactions.filter((item) => (item.name + item.detail + item.category).toLowerCase().includes(search.toLowerCase())), [search]);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  return (
    <div className="nexus-app">
      {mobileOpen && <button className="mobile-scrim" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><span>N</span><i /></div>
          <div><strong>NEXUS</strong><small>FINANCE</small></div>
          <button className="mobile-close icon-button" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"><X size={18}/></button>
        </div>
        <button className="workspace-switch" onClick={() => setCompanyOpen(!companyOpen)}>
          <span className="workspace-avatar"><Building2 size={17}/></span>
          <span className="workspace-copy"><strong>{company}</strong><small>Workspace principal</small></span>
          <ChevronDown size={15} className="muted-icon"/>
        </button>
        {companyOpen && <div className="company-menu">
          {["Nexus Studio", "Nexus Consultoria", "Todas as empresas"].map((name) => <button key={name} onClick={() => { setCompany(name); setCompanyOpen(false); }}><Building2 size={15}/>{name}{company === name && <Check size={14}/>}</button>)}
        </div>}
        <div className="sidebar-scroll">
          {navGroups.map((group) => <div className="nav-group" key={group.title}>
            <p className="nav-label">{group.title}</p>
            {group.items.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${active === label ? "nav-active" : ""}`} onClick={() => { setActive(label); setMobileOpen(false); }}>
              <Icon size={17} strokeWidth={1.8}/><span>{label}</span>{label === "Contas a pagar" && <em>8</em>}
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
          <button className="nav-item" onClick={() => showNotice("Central de ajuda em breve.")}><LifeBuoy size={17}/><span>Central de ajuda</span></button>
          <button className="nav-item" onClick={() => setActive("Configurações")}><Settings2 size={17}/><span>Configurações</span></button>
          <div className="profile">
            <div className="profile-avatar">RC</div>
            <div className="profile-copy"><strong>Rafael Costa</strong><small>Administrador</small></div>
            <MoreHorizontal size={18} className="muted-icon"/>
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
            <button className="icon-button notification-button" aria-label="Notificações" onClick={() => showNotice("Você está em dia! Nenhuma notificação nova.")}><Bell size={18}/><i/></button>
            <div className="top-avatar">RC</div>
          </div>
        </header>

        <div className="page-content">
          {active === "Dashboard" ? <>
            <div className="welcome-row">
              <div><div className="eyebrow"><span className="live-dot"/> VISÃO GERAL</div><h1>Bom dia, Rafael <span>✦</span></h1><p>Acompanhe a saúde financeira do seu negócio.</p></div>
              <div className="welcome-actions">
                <button className="button-secondary" onClick={() => showNotice("Exportação demonstrativa: disponível em uma próxima etapa.")}><Download size={16}/> Exportar</button>
                <button className="button-primary" onClick={() => showNotice("Formulário de nova transação será implementado na próxima etapa.")}><Plus size={17}/> Nova transação</button>
              </div>
            </div>

            <div className="dashboard-toolbar">
              <div className="period-label"><CalendarDays size={15}/> Período</div>
              <select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Selecionar período">
                <option>Últimos 7 meses</option><option>Este mês</option><option>Últimos 30 dias</option><option>Este trimestre</option>
              </select>
              <span className="updated-label"><span/> Atualizado agora</span>
            </div>

            <section className="metrics-grid">
              <article className="metric-card balance-card">
                <div className="metric-top"><span>Saldo total</span><span className="metric-icon"><Wallet size={17}/></span></div>
                <div className="metric-value-row"><strong>{balanceVisible ? "R$ 124.580" : "••••••••"}</strong><button className="visibility-button" onClick={() => setBalanceVisible(!balanceVisible)} aria-label="Mostrar ou ocultar saldo">{balanceVisible ? <Eye size={16}/> : <EyeOff size={16}/>}</button></div>
                <div className="metric-foot"><span className="positive"><TrendingUp size={13}/> 12,8%</span><span>vs. mês anterior</span></div>
                <div className="balance-spark"><svg viewBox="0 0 160 38" preserveAspectRatio="none"><path d="M0 31 C18 27 20 33 37 22 S59 25 72 15 S95 23 110 12 S136 18 160 2" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="M0 31 C18 27 20 33 37 22 S59 25 72 15 S95 23 110 12 S136 18 160 2 L160 38 L0 38Z" fill="currentColor" opacity=".08"/></svg></div>
              </article>
              <article className="metric-card"><div className="metric-top"><span>Receitas do período</span><span className="metric-icon mint-icon"><ArrowDownLeft size={17}/></span></div><div className="metric-value">R$ 64.200</div><div className="metric-foot"><span className="positive"><TrendingUp size={13}/> 8,2%</span><span>vs. mês anterior</span></div><div className="metric-progress"><i style={{width:"72%"}}/></div><small className="metric-caption">72% da meta mensal</small></article>
              <article className="metric-card"><div className="metric-top"><span>Despesas do período</span><span className="metric-icon coral-icon"><ArrowUpRight size={17}/></span></div><div className="metric-value">R$ 38.200</div><div className="metric-foot"><span className="negative"><TrendingUp size={13}/> 3,4%</span><span>vs. mês anterior</span></div><div className="metric-progress expense-progress"><i style={{width:"48%"}}/></div><small className="metric-caption">48% do limite planejado</small></article>
              <article className="metric-card"><div className="metric-top"><span>Resultado líquido</span><span className="metric-icon violet-icon"><CircleDollarSign size={17}/></span></div><div className="metric-value">R$ 26.000</div><div className="metric-foot"><span className="positive"><TrendingUp size={13}/> 18,6%</span><span>vs. mês anterior</span></div><div className="result-note"><span className="result-dot"/> Margem de 40,5%</div></article>
            </section>

            <section className="charts-grid">
              <article className="panel cash-panel">
                <div className="panel-heading"><div><h2>Fluxo de caixa</h2><p>Entradas e saídas ao longo do tempo</p></div><button className="select-like" onClick={() => setPeriod(period === "Últimos 7 meses" ? "Este trimestre" : "Últimos 7 meses")}>{period}<ChevronDown size={14}/></button></div>
                <div className="chart-legend"><span><i className="legend-income"/> Receitas</span><span><i className="legend-expense"/> Despesas</span></div>
                <div className="cash-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={cashData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}><defs><linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#20b889" stopOpacity={0.17}/><stop offset="95%" stopColor="#20b889" stopOpacity={0}/></linearGradient><linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f19b79" stopOpacity={0.13}/><stop offset="95%" stopColor="#f19b79" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#edf0f3" vertical={false}/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill:"#929ba8",fontSize:11}} dy={10}/><YAxis axisLine={false} tickLine={false} tick={{fill:"#929ba8",fontSize:11}} tickFormatter={(v) => `R$ ${v/1000}k`}/><Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{border:"1px solid #edf0f3",borderRadius:12,fontSize:12,boxShadow:"0 8px 24px #1b294012"}}/><Area type="monotone" dataKey="entradas" name="Receitas" stroke="#20b889" strokeWidth={2.5} fill="url(#incomeFill)" activeDot={{r:5,strokeWidth:0}}/><Area type="monotone" dataKey="saidas" name="Despesas" stroke="#ee9a78" strokeWidth={2.5} fill="url(#expenseFill)" activeDot={{r:5,strokeWidth:0}}/></AreaChart></ResponsiveContainer></div>
              </article>
              <article className="panel summary-panel">
                <div className="panel-heading"><div><h2>Resumo financeiro</h2><p>Visão consolidada do mês</p></div><button className="more-button" aria-label="Mais opções" onClick={() => showNotice("Mais opções em breve.")}><MoreHorizontal size={19}/></button></div>
                <div className="summary-total"><strong>R$ 26.000,00</strong><span className="positive"><TrendingUp size={13}/> 18,6%</span></div>
                <p className="summary-subtitle">Resultado líquido neste mês</p>
                <div className="summary-bar"><span/><span/><span/></div>
                <div className="summary-line"><span><i className="dot-income"/> Receitas</span><strong>R$ 64.200,00</strong></div>
                <div className="summary-line"><span><i className="dot-expense"/> Despesas</span><strong>R$ 38.200,00</strong></div>
                <div className="summary-divider"/>
                <div className="summary-footer"><span>Margem operacional</span><strong>40,5%</strong></div>
              </article>
            </section>

            <section className="bottom-grid">
              <article className="panel transactions-panel">
                <div className="panel-heading"><div><h2>Transações recentes</h2><p>Últimas movimentações da sua empresa</p></div><button className="text-link" onClick={() => setActive("Transações")}>Ver todas <ArrowUpRight size={14}/></button></div>
                <div className="transaction-table">
                  <div className="table-head"><span>DESCRIÇÃO</span><span>CATEGORIA</span><span>DATA</span><span>VALOR</span></div>
                  {filteredTransactions.map((item) => <div className="transaction-row" key={item.name}><div className="transaction-name"><div className={`transaction-avatar ${item.color}`}>{item.initials}</div><div><strong>{item.name}</strong><small>{item.detail}</small></div></div><span className="category-cell">{item.category}</span><span className="date-cell">{item.date}</span><strong className={item.type === "in" ? "amount-in" : "amount-out"}>{item.amount}</strong></div>)}
                  {filteredTransactions.length === 0 && <div className="empty-search">Nenhuma transação encontrada para “{search}”.</div>}
                </div>
              </article>
              <article className="panel payables-panel">
                <div className="panel-heading"><div><h2>Próximos vencimentos</h2><p>Contas que merecem atenção</p></div><button className="more-button" aria-label="Mais opções" onClick={() => setActive("Contas a pagar")}><MoreHorizontal size={19}/></button></div>
                <div className="due-item"><div className="due-icon due-red"><CreditCard size={16}/></div><div className="due-copy"><strong>Aluguel comercial</strong><small>Imobiliária Horizonte</small></div><div className="due-value"><strong>R$ 3.200,00</strong><small className="due-today">Vence hoje</small></div></div>
                <div className="due-item"><div className="due-icon due-purple"><FileText size={16}/></div><div className="due-copy"><strong>Serviços contábeis</strong><small>Contábil Prime</small></div><div className="due-value"><strong>R$ 850,00</strong><small>28 nov, 2026</small></div></div>
                <div className="due-item"><div className="due-icon due-blue"><Landmark size={16}/></div><div className="due-copy"><strong>Internet empresarial</strong><small>Conecta Fibra</small></div><div className="due-value"><strong>R$ 189,90</strong><small>30 nov, 2026</small></div></div>
                <button className="view-payables" onClick={() => setActive("Contas a pagar")}>Ver contas a pagar <ChevronRight size={15}/></button>
              </article>
            </section>
            <div className="demo-disclaimer"><ShieldCheck size={14}/> Ambiente de demonstração · Os valores exibidos são ilustrativos.</div>
          </> : <section className="coming-soon panel"><div className="coming-icon"><Command size={24}/></div><span className="eyebrow">NEXUS FINANCE</span><h1>{active}</h1><p>Esta área faz parte do NEXUS FINANCE e será construída em uma próxima etapa.</p><button className="button-primary" onClick={() => setActive("Dashboard")}><ChevronLeft size={16}/> Voltar ao dashboard</button></section>}
        </div>
      </main>
      {notice && <div className="toast"><Check size={16}/>{notice}</div>}
    </div>
  );
}
