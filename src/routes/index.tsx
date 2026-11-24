import { useEffect, useMemo, useState, type FormEvent } from "react";
import { LegalCenter } from "../components/LegalCenter";
import { SupabaseDashboard, SupabasePayables, SupabaseReceivables, SupabaseCashFlow, SupabaseAccounts, SupabaseCategories } from "../components/SupabaseFinancialModules";
import { AuthScreen } from "../components/AuthScreen";
import { supabase } from "../lib/supabase";
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


function AccountsPayable({ showNotice }: { showNotice: (message: string) => void }) {
 const [items,setItems]=useState([{id:1,title:"Aluguel comercial",supplier:"Imobiliária Horizonte",category:"Infraestrutura",due:"24/11/2026",amount:3200,status:"Pendente"},{id:2,title:"Serviços contábeis",supplier:"Contábil Prime",category:"Serviços",due:"28/11/2026",amount:850,status:"Pendente"},{id:3,title:"Internet empresarial",supplier:"Conecta Fibra",category:"Tecnologia",due:"30/11/2026",amount:189.9,status:"Pendente"},{id:4,title:"Licença de software",supplier:"Cloud Sistemas",category:"Tecnologia",due:"18/11/2026",amount:489.9,status:"Vencida"}]);
 const [filter,setFilter]=useState("Todas"),[query,setQuery]=useState(""),[modal,setModal]=useState(false),[draft,setDraft]=useState({title:"",supplier:"",category:"Administrativo",due:"",amount:""});
 const money=(n:number)=>n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
 const filtered=items.filter(x=>(filter==="Todas"||x.status===filter)&&(x.title+x.supplier).toLowerCase().includes(query.toLowerCase()));
 return <><div className="welcome-row"><div><div className="eyebrow"><span className="live-dot"/> FINANCEIRO</div><h1>Contas a pagar</h1><p>Organize compromissos, acompanhe vencimentos e controle suas despesas.</p></div><div className="welcome-actions"><button className="button-secondary" onClick={()=>showNotice("Exportação disponível em uma próxima etapa.")}><Download size={16}/> Exportar</button><button className="button-primary" onClick={()=>setModal(true)}><Plus size={17}/> Nova conta</button></div></div>
 <section className="payable-summary-grid"><article className="metric-card"><div className="metric-top"><span>Total em aberto</span><Wallet size={17}/></div><div className="metric-value">{money(items.filter(x=>x.status!=="Pago").reduce((s,x)=>s+x.amount,0))}</div><div className="metric-foot">Contas ainda não pagas</div></article><article className="metric-card"><div className="metric-top"><span>Vencimentos próximos</span><Clock3 size={17}/></div><div className="metric-value">{items.filter(x=>x.status==="Pendente").length}</div><div className="metric-foot">Precisam de atenção</div></article><article className="metric-card"><div className="metric-top"><span>Contas vencidas</span><ArrowUpRight size={17}/></div><div className="metric-value">{items.filter(x=>x.status==="Vencida").length}</div><div className="metric-foot">Verifique os atrasos</div></article><article className="metric-card"><div className="metric-top"><span>Contas cadastradas</span><FileText size={17}/></div><div className="metric-value">{items.length}</div><div className="metric-foot">Nesta demonstração</div></article></section>
 <section className="panel payable-list-panel"><div className="panel-heading"><div><h2>Despesas e compromissos</h2><p>Consulte e acompanhe suas obrigações financeiras</p></div></div><div className="payable-toolbar"><label className="payable-search"><Search size={15}/><input placeholder="Buscar por descrição ou fornecedor..." value={query} onChange={e=>setQuery(e.target.value)}/></label><select value={filter} onChange={e=>setFilter(e.target.value)}><option>Todas</option><option>Pendente</option><option>Pendente</option><option>Vencida</option><option>Pago</option></select></div><div className="payable-table"><div className="payable-table-head"><span>DESCRIÇÃO / FORNECEDOR</span><span>CATEGORIA</span><span>VENCIMENTO</span><span>VALOR</span><span>STATUS</span><span>AÇÃO</span></div>{filtered.map(x=><div className="payable-table-row" key={x.id}><div><strong>{x.title}</strong><small>{x.supplier}</small></div><span>{x.category}</span><span>{x.due}</span><strong>{money(x.amount)}</strong><span><i className={"status-pill "+(x.status==="Vencida"?"status-late":x.status==="Pendente"?"status-today":x.status==="Pago"?"status-paid":"status-pending")}>{x.status}</i></span><button className="pay-action" disabled={x.status==="Pago"} onClick={()=>setItems(prev=>prev.map(p=>p.id===x.id?{...p,status:"Pago"}:p))}>{x.status==="Pago"?"Concluído":"Marcar pago"}</button></div>)}{filtered.length===0&&<div className="empty-search">Nenhuma conta encontrada.</div>}</div><div className="demo-disclaimer"><ShieldCheck size={14}/> Dados ilustrativos · alterações ficam apenas nesta sessão.</div></section>
 {modal&&<div className="modal-backdrop" onClick={()=>setModal(false)}><form className="payable-modal" onClick={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();setItems(prev=>[{id:Date.now(),...draft,amount:Number(draft.amount),due:new Date(draft.due+"T12:00:00").toLocaleDateString("pt-BR"),status:"Pendente"},...prev]);setDraft({title:"",supplier:"",category:"Administrativo",due:"",amount:""});setModal(false);showNotice("Conta adicionada à demonstração.");}}><div className="modal-heading"><div><h2>Nova conta a pagar</h2><p>Informe os dados do compromisso</p></div><button type="button" className="icon-button" onClick={()=>setModal(false)}><X size={18}/></button></div><label>Descrição<input required value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label><label>Fornecedor<input required value={draft.supplier} onChange={e=>setDraft({...draft,supplier:e.target.value})}/></label><div className="modal-fields"><label>Valor (R$)<input required type="number" min="0.01" step="0.01" value={draft.amount} onChange={e=>setDraft({...draft,amount:e.target.value})}/></label><label>Vencimento<input required type="date" value={draft.due} onChange={e=>setDraft({...draft,due:e.target.value})}/></label></div><label>Categoria<select value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value})}><option>Administrativo</option><option>Infraestrutura</option><option>Tecnologia</option><option>Serviços</option><option>Marketing</option></select></label><div className="modal-actions"><button type="button" className="button-secondary" onClick={()=>setModal(false)}>Cancelar</button><button type="submit" className="button-primary"><Plus size={15}/> Adicionar conta</button></div></form></div>}</>;
}


function AccountsReceivable({ showNotice }: { showNotice: (message: string) => void }) {
 const [items,setItems]=useState([{id:1,title:"Projeto identidade visual",customer:"Studio Aurora",category:"Serviços",due:"24/11/2026",amount:8500,status:"Pendente"},{id:2,title:"Consultoria empresarial",customer:"Grupo Monteiro",category:"Consultoria",due:"28/11/2026",amount:12000,status:"Pendente"},{id:3,title:"Mensalidade plataforma",customer:"Comercial São Lucas",category:"Assinatura",due:"30/11/2026",amount:490,status:"Pendente"},{id:4,title:"Desenvolvimento de site",customer:"Loja Horizonte",category:"Projetos",due:"18/11/2026",amount:3600,status:"Vencida"}]);
 const [filter,setFilter]=useState("Todas"),[query,setQuery]=useState(""),[modal,setModal]=useState(false),[draft,setDraft]=useState({title:"",customer:"",category:"Serviços",due:"",amount:""});
 const money=(n:number)=>n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
 const filtered=items.filter(x=>(filter==="Todas"||x.status===filter)&&(x.title+x.customer).toLowerCase().includes(query.toLowerCase()));
 const pending=items.filter(x=>x.status!=="Recebido").reduce((s,x)=>s+x.amount,0);
 return <><div className="welcome-row"><div><div className="eyebrow"><span className="live-dot"/> FINANCEIRO</div><h1>Contas a receber</h1><p>Acompanhe cobranças, recebimentos e valores pendentes dos seus clientes.</p></div><div className="welcome-actions"><button className="button-secondary" onClick={()=>showNotice("Exportação será disponibilizada em uma próxima etapa.")}><Download size={16}/> Exportar</button><button className="button-primary" onClick={()=>setModal(true)}><Plus size={17}/> Nova cobrança</button></div></div>
 <section className="payable-summary-grid"><article className="metric-card"><div className="metric-top"><span>Total a receber</span><Wallet size={17}/></div><div className="metric-value">{money(pending)}</div><div className="metric-foot">Valores ainda não recebidos</div></article><article className="metric-card"><div className="metric-top"><span>Vencimentos próximos</span><Clock3 size={17}/></div><div className="metric-value">{items.filter(x=>x.status==="Pendente").length}</div><div className="metric-foot">Itens pendentes</div></article><article className="metric-card"><div className="metric-top"><span>Em atraso</span><ArrowUpRight size={17}/></div><div className="metric-value">{money(items.filter(x=>x.status==="Vencida").reduce((s,x)=>s+x.amount,0))}</div><div className="metric-foot">Valores vencidos</div></article><article className="metric-card"><div className="metric-top"><span>Cobranças abertas</span><FileText size={17}/></div><div className="metric-value">{items.filter(x=>x.status!=="Recebido").length}</div><div className="metric-foot">Nesta demonstração</div></article></section>
 <section className="panel payable-list-panel"><div className="panel-heading"><div><h2>Cobranças e recebimentos</h2><p>Consulte os valores previstos e acompanhe cada cobrança</p></div></div><div className="payable-toolbar"><label className="payable-search"><Search size={15}/><input placeholder="Buscar por cobrança ou cliente..." value={query} onChange={e=>setQuery(e.target.value)}/></label><select value={filter} onChange={e=>setFilter(e.target.value)}><option>Todas</option><option>Pendente</option><option>Pendente</option><option>Vencida</option><option>Recebido</option></select></div><div className="payable-table"><div className="payable-table-head"><span>COBRANÇA / CLIENTE</span><span>CATEGORIA</span><span>VENCIMENTO</span><span>VALOR</span><span>STATUS</span><span>AÇÃO</span></div>{filtered.map(x=><div className="payable-table-row" key={x.id}><div><strong>{x.title}</strong><small>{x.customer}</small></div><span>{x.category}</span><span>{x.due}</span><strong>{money(x.amount)}</strong><span><i className={"status-pill "+(x.status==="Vencida"?"status-late":x.status==="Pendente"?"status-today":x.status==="Recebido"?"status-paid":"status-pending")}>{x.status}</i></span><button className="pay-action" disabled={x.status==="Recebido"} onClick={()=>setItems(prev=>prev.map(p=>p.id===x.id?{...p,status:"Recebido"}:p))}>{x.status==="Recebido"?"Concluído":"Marcar recebido"}</button></div>)}{filtered.length===0&&<div className="empty-search">Nenhuma cobrança encontrada.</div>}</div><div className="demo-disclaimer"><ShieldCheck size={14}/> Dados ilustrativos · alterações ficam apenas nesta sessão e não são salvas em banco de dados.</div></section>
 {modal&&<div className="modal-backdrop" onClick={()=>setModal(false)}><form className="payable-modal" onClick={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();setItems(prev=>[{id:Date.now(),...draft,amount:Number(draft.amount),due:new Date(draft.due+"T12:00:00").toLocaleDateString("pt-BR"),status:"Pendente"},...prev]);setDraft({title:"",customer:"",category:"Serviços",due:"",amount:""});setModal(false);showNotice("Cobrança adicionada à demonstração.");}}><div className="modal-heading"><div><h2>Nova cobrança</h2><p>Cadastre um valor a receber de um cliente</p></div><button type="button" className="icon-button" onClick={()=>setModal(false)}><X size={18}/></button></div><label>Descrição<input required value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="Ex.: Serviço prestado"/></label><label>Cliente<input required value={draft.customer} onChange={e=>setDraft({...draft,customer:e.target.value})} placeholder="Nome do cliente"/></label><div className="modal-fields"><label>Valor (R$)<input required type="number" min="0.01" step="0.01" value={draft.amount} onChange={e=>setDraft({...draft,amount:e.target.value})} placeholder="0,00"/></label><label>Vencimento<input required type="date" value={draft.due} onChange={e=>setDraft({...draft,due:e.target.value})}/></label></div><label>Categoria<select value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value})}><option>Serviços</option><option>Consultoria</option><option>Assinatura</option><option>Projetos</option><option>Vendas</option></select></label><div className="modal-actions"><button type="button" className="button-secondary" onClick={()=>setModal(false)}>Cancelar</button><button type="submit" className="button-primary"><Plus size={15}/> Criar cobrança</button></div></form></div>}</>;
}


function CashFlow({ showNotice }: { showNotice: (message: string) => void }) {
 const [horizon,setHorizon]=useState("30"),[view,setView]=useState("Todos");
 const rows=[{id:1,date:"24/11/2026",description:"Projeto identidade visual",detail:"Studio Aurora",type:"Entrada",status:"Realizado",amount:8500},{id:2,date:"24/11/2026",description:"Aluguel comercial",detail:"Imobiliária Horizonte",type:"Saída",status:"Realizado",amount:3200},{id:3,date:"28/11/2026",description:"Consultoria empresarial",detail:"Grupo Monteiro",type:"Entrada",status:"Previsto",amount:12000},{id:4,date:"28/11/2026",description:"Serviços contábeis",detail:"Contábil Prime",type:"Saída",status:"Previsto",amount:850},{id:5,date:"30/11/2026",description:"Mensalidade plataforma",detail:"Comercial São Lucas",type:"Entrada",status:"Previsto",amount:490},{id:6,date:"30/11/2026",description:"Internet empresarial",detail:"Conecta Fibra",type:"Saída",status:"Previsto",amount:189.9},{id:7,date:"04/12/2026",description:"Desenvolvimento de site",detail:"Loja Horizonte",type:"Entrada",status:"Previsto",amount:3600},{id:8,date:"05/12/2026",description:"Licenças de software",detail:"Cloud Sistemas",type:"Saída",status:"Previsto",amount:489.9}];
 const money=(n:number)=>n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
 const realizedIn=rows.filter(x=>x.status==="Realizado"&&x.type==="Entrada").reduce((s,x)=>s+x.amount,0),realizedOut=rows.filter(x=>x.status==="Realizado"&&x.type==="Saída").reduce((s,x)=>s+x.amount,0),forecastIn=rows.filter(x=>x.status==="Previsto"&&x.type==="Entrada").reduce((s,x)=>s+x.amount,0),forecastOut=rows.filter(x=>x.status==="Previsto"&&x.type==="Saída").reduce((s,x)=>s+x.amount,0);
 const opening=25000,current=opening+realizedIn-realizedOut,projected=current+forecastIn-forecastOut;
 const chart=[{day:"Hoje",realizado:current,projetado:current},{day:"28 nov",realizado:current,projetado:current+11150},{day:"30 nov",realizado:current,projetado:current+11450.1},{day:"04 dez",realizado:current,projetado:current+15050.1},{day:"05 dez",realizado:current,projetado:projected}];
 const visible=rows.filter(x=>view==="Todos"||x.status===view);
 return <>
 <div className="welcome-row"><div><div className="eyebrow"><span className="live-dot"/> FINANCEIRO</div><h1>Fluxo de caixa</h1><p>Entenda o movimento do dinheiro e acompanhe a projeção do saldo.</p></div><div className="welcome-actions"><button className="button-secondary" onClick={()=>showNotice("A exportação será implementada em uma próxima etapa.")}><Download size={16}/> Exportar</button><button className="button-primary" onClick={()=>showNotice("A integração dos lançamentos será feita após a conexão do banco de dados.")}><Plus size={17}/> Nova movimentação</button></div></div>
 <div className="cashflow-toolbar"><label>Projeção<select value={horizon} onChange={e=>setHorizon(e.target.value)}><option value="7">Próximos 7 dias</option><option value="15">Próximos 15 dias</option><option value="30">Próximos 30 dias</option><option value="60">Próximos 60 dias</option><option value="90">Próximos 90 dias</option></select></label><span className="cashflow-asof"><CalendarDays size={14}/> Posição em 24/11/2026</span></div>
 <section className="payable-summary-grid cashflow-metrics"><article className="metric-card"><div className="metric-top"><span>Saldo inicial</span><Wallet size={17}/></div><div className="metric-value">{money(opening)}</div><div className="metric-foot">Saldo de abertura ilustrativo</div></article><article className="metric-card"><div className="metric-top"><span>Entradas realizadas</span><ArrowDownLeft size={17}/></div><div className="metric-value">{money(realizedIn)}</div><div className="metric-foot">Movimentações efetivadas</div></article><article className="metric-card"><div className="metric-top"><span>Saídas realizadas</span><ArrowUpRight size={17}/></div><div className="metric-value">{money(realizedOut)}</div><div className="metric-foot">Movimentações efetivadas</div></article><article className="metric-card"><div className="metric-top"><span>Saldo atual realizado</span><Activity size={17}/></div><div className="metric-value">{money(current)}</div><div className="metric-foot">Saldo inicial + entradas − saídas</div></article></section>
 <section className="charts-grid cashflow-chart-grid"><article className="panel cash-panel"><div className="panel-heading"><div><h2>Projeção do saldo</h2><p>Comparação entre saldo atual e saldo projetado</p></div><span className="projection-tag">Até {horizon} dias</span></div><div className="chart-legend"><span><i className="legend-income"/> Saldo realizado</span><span><i className="legend-projection"/> Saldo projetado</span></div><div className="cash-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chart} margin={{top:10,right:8,left:-18,bottom:0}}><CartesianGrid stroke="#edf0f3" vertical={false}/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:"#929ba8",fontSize:11}} dy={10}/><YAxis axisLine={false} tickLine={false} tick={{fill:"#929ba8",fontSize:11}} tickFormatter={v=>"R$ "+Math.round(v/1000)+"k"}/><Tooltip formatter={v=>money(Number(v))} contentStyle={{border:"1px solid #edf0f3",borderRadius:12,fontSize:12}}/><Area type="monotone" dataKey="realizado" name="Saldo realizado" stroke="#20b889" strokeWidth={2.5} fill="#20b889" fillOpacity={.08}/><Area type="monotone" dataKey="projetado" name="Saldo projetado" stroke="#6c8fe8" strokeWidth={2.5} strokeDasharray="5 4" fill="#6c8fe8" fillOpacity={.06}/></AreaChart></ResponsiveContainer></div></article><article className="panel summary-panel"><div className="panel-heading"><div><h2>Resumo da projeção</h2><p>Considerando os lançamentos previstos</p></div></div><div className="cashflow-projection-total"><strong>{money(projected)}</strong><span>Saldo projetado</span></div><div className="summary-line"><span><i className="dot-income"/> Entradas previstas</span><strong>{money(forecastIn)}</strong></div><div className="summary-line"><span><i className="dot-expense"/> Saídas previstas</span><strong>{money(forecastOut)}</strong></div><div className="summary-divider"/><div className="summary-footer"><span>Variação prevista</span><strong className={projected>=current?"positive":"negative"}>{money(projected-current)}</strong></div><p className="cashflow-horizon-note">Janela selecionada: {horizon} dias. Valores ilustrativos.</p></article></section>
 <section className="panel payable-list-panel"><div className="panel-heading"><div><h2>Movimentações do caixa</h2><p>Entradas e saídas realizadas ou previstas</p></div><select className="cashflow-filter" value={view} onChange={e=>setView(e.target.value)}><option>Todos</option><option>Realizado</option><option>Previsto</option></select></div><div className="payable-table"><div className="payable-table-head cashflow-table-head"><span>DESCRIÇÃO</span><span>DATA</span><span>TIPO</span><span>STATUS</span><span>VALOR</span></div>{visible.map(x=><div className="payable-table-row cashflow-table-row" key={x.id}><div><strong>{x.description}</strong><small>{x.detail}</small></div><span>{x.date}</span><span className={x.type==="Entrada"?"amount-in":"amount-out"}>{x.type}</span><span><i className={"status-pill "+(x.status==="Realizado"?"status-paid":"status-pending")}>{x.status}</i></span><strong className={x.type==="Entrada"?"amount-in":"amount-out"}>{x.type==="Entrada"?"+ ":"− "}{money(x.amount)}</strong></div>)}</div><div className="demo-disclaimer"><ShieldCheck size={14}/> Dados ilustrativos · não representam movimentações bancárias reais. O saldo previsto considera somente os lançamentos exibidos.</div></section>
 </>;
}


function FinancialAccounts({ showNotice }: { showNotice: (message: string) => void }) {
 const [accounts,setAccounts]=useState([{id:1,name:"Conta principal",bank:"Banco Horizonte",kind:"Conta corrente",balance:32500},{id:2,name:"Reserva financeira",bank:"Banco Horizonte",kind:"Poupança",balance:18000},{id:3,name:"Caixa da empresa",bank:"Dinheiro em caixa",kind:"Caixa físico",balance:2450},{id:4,name:"Carteira digital",bank:"Nexus Pay",kind:"Carteira digital",balance:6300}]);
 const [modal,setModal]=useState(false),[transfer,setTransfer]=useState(false),[draft,setDraft]=useState({name:"",bank:"",kind:"Conta corrente",balance:""}),[move,setMove]=useState({from:"1",to:"2",amount:"",description:"Transferência entre contas"});
 const money=(v:number)=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
 const total=accounts.reduce((s,a)=>s+a.balance,0);
 const submitTransfer=(e:FormEvent)=>{e.preventDefault();const amount=Number(move.amount),from=Number(move.from),to=Number(move.to);if(from===to||!Number.isFinite(amount)||amount<=0){showNotice("Selecione contas diferentes e informe um valor válido.");return;}const source=accounts.find(a=>a.id===from);if(!source||source.balance<amount){showNotice("Saldo insuficiente na conta de origem.");return;}setAccounts(prev=>prev.map(a=>a.id===from?{...a,balance:a.balance-amount}:a.id===to?{...a,balance:a.balance+amount}:a));setTransfer(false);setMove({...move,amount:""});showNotice("Transferência simulada nesta sessão. Nenhuma movimentação bancária real foi realizada.");};
 return <>
 <div className="welcome-row"><div><div className="eyebrow"><span className="live-dot"/> FINANCEIRO</div><h1>Contas financeiras</h1><p>Organize saldos e acompanhe suas contas em um só lugar.</p></div><div className="welcome-actions"><button className="button-secondary" onClick={()=>setTransfer(true)} disabled={accounts.length<2}><ArrowLeftRight size={16}/> Transferir</button><button className="button-primary" onClick={()=>setModal(true)}><Plus size={17}/> Nova conta</button></div></div>
 <section className="account-total-card"><div><span>Saldo consolidado</span><strong>{money(total)}</strong><small>Soma dos saldos das contas cadastradas nesta demonstração</small></div><div className="account-total-icon"><Wallet size={25}/></div></section>
 <div className="account-section-heading"><div><h2>Suas contas</h2><p>{accounts.length} contas cadastradas</p></div></div>
 <section className="financial-account-grid">{accounts.map(a=><article className="financial-account-card" key={a.id}><div className="financial-account-top"><span className="account-bank-icon"><Landmark size={19}/></span><span className="account-kind">{a.kind}</span></div><div className="account-bank-name">{a.bank}</div><h3>{a.name}</h3><div className="account-balance-label">Saldo disponível</div><strong className="account-balance">{money(a.balance)}</strong><div className="account-card-footer"><span><ShieldCheck size={13}/> Conta cadastrada</span><button onClick={()=>showNotice("O extrato detalhado será conectado aos lançamentos financeiros em uma próxima etapa.")}>Ver detalhes <ArrowUpRight size={13}/></button></div></article>)}</section>
 <section className="panel account-transfer-panel"><div className="panel-heading"><div><h2>Transferências entre contas</h2><p>Mova valores entre contas cadastradas sem contabilizar como receita ou despesa.</p></div><button className="button-secondary" onClick={()=>setTransfer(true)} disabled={accounts.length<2}><ArrowLeftRight size={15}/> Nova transferência</button></div><div className="transfer-info"><ArrowLeftRight size={18}/><span>Transferências internas alteram o saldo das contas de origem e destino, sem modificar o saldo consolidado da empresa.</span></div></section>
 <div className="demo-disclaimer"><ShieldCheck size={14}/> Dados ilustrativos · contas e transferências são temporárias e não estão conectadas a bancos reais.</div>
 {modal&&<div className="modal-backdrop" onClick={()=>setModal(false)}><form className="payable-modal" onClick={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();setAccounts(prev=>[{id:Date.now(),name:draft.name,bank:draft.bank,kind:draft.kind,balance:Number(draft.balance)},...prev]);setDraft({name:"",bank:"",kind:"Conta corrente",balance:""});setModal(false);showNotice("Conta adicionada à demonstração.");}}><div className="modal-heading"><div><h2>Adicionar conta financeira</h2><p>Cadastre uma conta para acompanhar o saldo</p></div><button type="button" className="icon-button" onClick={()=>setModal(false)}><X size={18}/></button></div><label>Nome da conta<input required value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="Ex.: Conta operacional"/></label><label>Banco ou instituição<input required value={draft.bank} onChange={e=>setDraft({...draft,bank:e.target.value})} placeholder="Nome da instituição"/></label><label>Tipo de conta<select value={draft.kind} onChange={e=>setDraft({...draft,kind:e.target.value})}><option>Conta corrente</option><option>Poupança</option><option>Caixa físico</option><option>Carteira digital</option><option>Outra</option></select></label><label>Saldo inicial (R$)<input required type="number" min="0" step="0.01" value={draft.balance} onChange={e=>setDraft({...draft,balance:e.target.value})} placeholder="0,00"/></label><div className="modal-actions"><button type="button" className="button-secondary" onClick={()=>setModal(false)}>Cancelar</button><button type="submit" className="button-primary"><Plus size={15}/> Adicionar conta</button></div></form></div>}
 {transfer&&<div className="modal-backdrop" onClick={()=>setTransfer(false)}><form className="payable-modal" onClick={e=>e.stopPropagation()} onSubmit={submitTransfer}><div className="modal-heading"><div><h2>Transferir entre contas</h2><p>Movimentação interna sem impacto no consolidado</p></div><button type="button" className="icon-button" onClick={()=>setTransfer(false)}><X size={18}/></button></div><label>Conta de origem<select value={move.from} onChange={e=>setMove({...move,from:e.target.value})}>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {money(a.balance)}</option>)}</select></label><label>Conta de destino<select value={move.to} onChange={e=>setMove({...move,to:e.target.value})}>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>Valor da transferência (R$)<input required type="number" min="0.01" step="0.01" value={move.amount} onChange={e=>setMove({...move,amount:e.target.value})} placeholder="0,00"/></label><label>Descrição<input value={move.description} onChange={e=>setMove({...move,description:e.target.value})}/></label><div className="modal-actions"><button type="button" className="button-secondary" onClick={()=>setTransfer(false)}>Cancelar</button><button type="submit" className="button-primary"><ArrowLeftRight size={15}/> Confirmar transferência</button></div></form></div>}
 </>;
}


function CategoriesCostCenters({showNotice}:{showNotice:(message:string)=>void}){
 const [tab,setTab]=useState("Categorias"),[kind,setKind]=useState("Despesa"),[query,setQuery]=useState(""),[modal,setModal]=useState(false);
 const [cats,setCats]=useState([{id:1,name:"Vendas",kind:"Receita",parent:"—",color:"#299b78"},{id:2,name:"Prestação de serviços",kind:"Receita",parent:"—",color:"#5487c8"},{id:3,name:"Alimentação",kind:"Despesa",parent:"Operacional",color:"#d49a55"},{id:4,name:"Aluguel",kind:"Despesa",parent:"Operacional",color:"#8d79c8"},{id:5,name:"Marketing",kind:"Despesa",parent:"—",color:"#d77b78"},{id:6,name:"Software",kind:"Despesa",parent:"Tecnologia",color:"#5b9ba8"}]);
 const [centers,setCenters]=useState([{id:1,name:"Administrativo",code:"ADM-001",manager:"A definir",budget:8000},{id:2,name:"Comercial",code:"COM-001",manager:"A definir",budget:12000},{id:3,name:"Tecnologia",code:"TEC-001",manager:"A definir",budget:15000},{id:4,name:"Marketing",code:"MKT-001",manager:"A definir",budget:6000}]);
 const [draft,setDraft]=useState({name:"",parent:"",code:"",manager:"",budget:""});
 const filteredCats=cats.filter(x=>(kind==="Todas"||x.kind===kind)&&x.name.toLowerCase().includes(query.toLowerCase()));
 const filteredCenters=centers.filter(x=>(x.name+x.code+x.manager).toLowerCase().includes(query.toLowerCase()));
 const money=(v:number)=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
 return <><div className="welcome-row"><div><div className="eyebrow"><span className="live-dot"/> CONFIGURAÇÕES FINANCEIRAS</div><h1>Categorias e centros de custo</h1><p>Organize receitas, despesas, departamentos e projetos da sua empresa.</p></div><div className="welcome-actions"><button className="button-primary" onClick={()=>{setDraft({name:"",parent:"",code:"",manager:"",budget:""});setModal(true)}}><Plus size={16}/> {tab==="Categorias"?"Nova categoria":"Novo centro de custo"}</button></div></div>
 <div className="category-tabs"><button className={tab==="Categorias"?"active":""} onClick={()=>setTab("Categorias")}> <Tags size={15}/> Categorias</button><button className={tab==="Centros de custo"?"active":""} onClick={()=>setTab("Centros de custo")}><Network size={15}/> Centros de custo</button></div>
 <section className="payable-summary-grid"><article className="metric-card"><div className="metric-top"><span>Categorias cadastradas</span><Tags size={17}/></div><div className="metric-value">{cats.length}</div><div className="metric-foot">Receitas e despesas</div></article><article className="metric-card"><div className="metric-top"><span>Centros de custo</span><Network size={17}/></div><div className="metric-value">{centers.length}</div><div className="metric-foot">Departamentos e projetos</div></article><article className="metric-card"><div className="metric-top"><span>Categorias de receita</span><ArrowDownLeft size={17}/></div><div className="metric-value">{cats.filter(x=>x.kind==="Receita").length}</div><div className="metric-foot">Classificação de entradas</div></article><article className="metric-card"><div className="metric-top"><span>Categorias de despesa</span><ArrowUpRight size={17}/></div><div className="metric-value">{cats.filter(x=>x.kind==="Despesa").length}</div><div className="metric-foot">Classificação de saídas</div></article></section>
 <section className="panel payable-list-panel"><div className="panel-heading"><div><h2>{tab}</h2><p>{tab==="Categorias"?"Classifique suas movimentações financeiras":"Organize os custos por departamento ou projeto"}</p></div></div><div className="payable-toolbar"><label className="payable-search"><Search size={15}/><input placeholder="Pesquisar..." value={query} onChange={e=>setQuery(e.target.value)}/></label>{tab==="Categorias"&&<select value={kind} onChange={e=>setKind(e.target.value)}><option>Despesa</option><option>Receita</option><option>Todas</option></select>}</div>{tab==="Categorias"?<div className="payable-table"><div className="payable-table-head category-table-head"><span>CATEGORIA</span><span>TIPO</span><span>SUBCATEGORIA DE</span><span>AÇÃO</span></div>{filteredCats.map(x=><div className="payable-table-row category-table-row" key={x.id}><div className="category-name-cell"><i style={{background:x.color}}/><strong>{x.name}</strong></div><span><i className={"status-pill "+(x.kind==="Receita"?"status-paid":"status-late")}>{x.kind}</i></span><span>{x.parent}</span><button className="pay-action" onClick={()=>{setCats(prev=>prev.filter(a=>a.id!==x.id));showNotice("Categoria removida da demonstração.")}}>Excluir</button></div>)}</div>:<div className="payable-table"><div className="payable-table-head center-table-head"><span>CENTRO DE CUSTO</span><span>CÓDIGO</span><span>RESPONSÁVEL</span><span>ORÇAMENTO MENSAL</span><span>AÇÃO</span></div>{filteredCenters.map(x=><div className="payable-table-row center-table-row" key={x.id}><div><strong>{x.name}</strong><small>Departamento / projeto</small></div><span>{x.code}</span><span>{x.manager}</span><strong>{money(x.budget)}</strong><button className="pay-action" onClick={()=>{setCenters(prev=>prev.filter(a=>a.id!==x.id));showNotice("Centro de custo removido da demonstração.")}}>Excluir</button></div>)}</div>}<div className="demo-disclaimer"><ShieldCheck size={14}/> Dados ilustrativos · cadastros e alterações não são persistidos no banco de dados.</div></section>
 {modal&&<div className="modal-backdrop" onClick={()=>setModal(false)}><form className="payable-modal" onClick={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();if(tab==="Categorias"){setCats(prev=>[{id:Date.now(),name:draft.name,kind,parent:draft.parent||"—",color:kind==="Receita"?"#299b78":"#d49a55"},...prev]);}else{setCenters(prev=>[{id:Date.now(),name:draft.name,code:draft.code,manager:draft.manager||"A definir",budget:Number(draft.budget)},...prev]);}setModal(false);showNotice("Cadastro adicionado à demonstração.");}}><div className="modal-heading"><div><h2>{tab==="Categorias"?"Nova categoria":"Novo centro de custo"}</h2><p>Preencha os dados para organizar sua gestão</p></div><button type="button" className="icon-button" onClick={()=>setModal(false)}><X size={18}/></button></div><label>Nome<input required value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="Nome"/></label>{tab==="Categorias"?<><label>Tipo<select value={kind} onChange={e=>setKind(e.target.value)}><option>Despesa</option><option>Receita</option></select></label><label>Categoria principal (opcional)<input value={draft.parent} onChange={e=>setDraft({...draft,parent:e.target.value})} placeholder="Ex.: Operacional"/></label></>:<><label>Código<input required value={draft.code} onChange={e=>setDraft({...draft,code:e.target.value})} placeholder="Ex.: ADM-002"/></label><label>Responsável<input value={draft.manager} onChange={e=>setDraft({...draft,manager:e.target.value})} placeholder="Nome do responsável"/></label><label>Orçamento mensal (R$)<input required type="number" min="0" step="0.01" value={draft.budget} onChange={e=>setDraft({...draft,budget:e.target.value})} placeholder="0,00"/></label></>}<div className="modal-actions"><button type="button" className="button-secondary" onClick={()=>setModal(false)}>Cancelar</button><button type="submit" className="button-primary"><Plus size={15}/> Salvar</button></div></form></div>}
 </>;
}

function WorkspaceModule({title,showNotice}:{title:string;showNotice:(message:string)=>void}) {
 const [query,setQuery]=useState("");
 const [records,setRecords]=useState<Record<string,string>[]>([]);
 const [draft,setDraft]=useState<Record<string,string>>({});
 const [open,setOpen]=useState(false);
 const [statusFilter,setStatusFilter]=useState("Todos");
 const [settings,setSettings]=useState({language:"Português (Brasil)",currency:"BRL",timezone:"America/Sao_Paulo",notifications:true});
 const [period,setPeriod]=useState("Este mês");
 const descriptions:Record<string,string>={"Transações":"Controle entradas, saídas e transferências","Relatórios":"Indicadores gerenciais e demonstrativos financeiros","Clientes":"Relacionamento e dados comerciais","Fornecedores":"Contatos, pagamentos e condições comerciais","Empresas":"Organizações e unidades de negócio","Equipe":"Colaboradores e níveis de acesso","NEXUS AI":"Insights demonstrativos para apoiar decisões financeiras","Assinatura":"Planos e recursos da plataforma","Administração":"Visão geral da operação da plataforma","Configurações":"Preferências do seu ambiente"};
 const fields:Record<string,{key:string;label:string;type?:string;required?:boolean;options?:string[]}[]> = {
  "Transações":[{key:"description",label:"Descrição",required:true},{key:"type",label:"Tipo",options:["Receita","Despesa","Transferência"]},{key:"amount",label:"Valor (R$)",type:"number",required:true},{key:"date",label:"Data",type:"date",required:true},{key:"category",label:"Categoria"},{key:"account",label:"Conta bancária"},{key:"status",label:"Status",options:["Pago","Pendente","Agendado"]}],
  "Clientes":[{key:"name",label:"Nome / Razão social",required:true},{key:"document",label:"CPF / CNPJ"},{key:"email",label:"E-mail",type:"email"},{key:"phone",label:"Telefone"},{key:"status",label:"Status",options:["Ativo","Inativo"]}],
  "Fornecedores":[{key:"name",label:"Nome / Razão social",required:true},{key:"document",label:"CPF / CNPJ"},{key:"email",label:"E-mail",type:"email"},{key:"phone",label:"Telefone"},{key:"status",label:"Status",options:["Ativo","Inativo"]}],
  "Empresas":[{key:"name",label:"Nome da empresa",required:true},{key:"document",label:"CNPJ"},{key:"email",label:"E-mail"},{key:"status",label:"Status",options:["Ativa","Inativa"]}],
  "Equipe":[{key:"name",label:"Nome completo",required:true},{key:"email",label:"E-mail",type:"email",required:true},{key:"role",label:"Perfil de acesso",options:["Administrador","Financeiro","Operador","Visualizador"]},{key:"status",label:"Status",options:["Ativo","Convidado","Inativo"]}]
 };
 const defaults:Record<string,Record<string,string>[]> = {
  "Transações":[{description:"Recebimento de cliente",type:"Receita",amount:"12500",date:"2026-11-20",category:"Vendas",account:"Conta principal",status:"Pago"},{description:"Aluguel do escritório",type:"Despesa",amount:"3200",date:"2026-11-22",category:"Estrutura",account:"Conta principal",status:"Pendente"},{description:"Assinatura de software",type:"Despesa",amount:"490",date:"2026-11-24",category:"Tecnologia",account:"Cartão corporativo",status:"Agendado"}],
  "Clientes":[{name:"Acme Soluções",document:"00.000.000/0001-00",email:"contato@acme.exemplo",phone:"(11) 3000-0000",status:"Ativo"},{name:"Nova Era Comércio",document:"11.111.111/0001-11",email:"financeiro@novaera.exemplo",phone:"(31) 3000-0000",status:"Ativo"}],
  "Fornecedores":[{name:"Tech Serviços",document:"22.222.222/0001-22",email:"contas@tech.exemplo",phone:"(11) 4000-0000",status:"Ativo"},{name:"Office Materiais",document:"33.333.333/0001-33",email:"vendas@office.exemplo",phone:"(31) 4000-0000",status:"Ativo"}],
  "Empresas":[{name:"Nexus Studio",document:"00.000.000/0001-00",email:"admin@nexus.exemplo",status:"Ativa"},{name:"Nexus Consultoria",document:"11.111.111/0001-11",email:"contato@nexus.exemplo",status:"Ativa"}],
  "Equipe":[{name:"Marina Costa",email:"marina@nexus.exemplo",role:"Administrador",status:"Ativo"},{name:"Rafael Lima",email:"rafael@nexus.exemplo",role:"Financeiro",status:"Ativo"}]
 };
 const rows=[...(defaults[title]||[]),...records].filter(row=>Object.values(row).join(" ").toLowerCase().includes(query.toLowerCase())&&(statusFilter==="Todos"||row['status']===statusFilter));
 const formatMoney=(value:string)=>Number(value||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
 const canCreate=Boolean(fields[title]);
 const save=(e:React.FormEvent)=>{e.preventDefault();setRecords(old=>[draft,...old]);setDraft({});setOpen(false);showNotice("Cadastro adicionado nesta sessão de demonstração.")};
 const heading=(title==="Transações"?"Nova transação":"Novo cadastro");
 return <div className="workspace-module">
  <div className="welcome-row"><div><div className="eyebrow">NEXUS FINANCE</div><h1>{title}</h1><p>{descriptions[title]}</p></div>{canCreate&&<button className="button-primary" onClick={()=>{setDraft({});setOpen(true)}}><Plus size={15}/> {title==="Transações"?"Nova transação":"Novo cadastro"}</button>}</div>
  {canCreate&&<section className="panel payable-list-panel"><div className="panel-heading"><div><h2>{title} cadastrados</h2><p>{rows.length} registro(s) na demonstração</p></div></div><div className="payable-toolbar"><label className="payable-search"><Search size={15}/><input placeholder="Pesquisar..." value={query} onChange={e=>setQuery(e.target.value)}/></label><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>Todos</option><option>Ativo</option><option>Ativa</option><option>Pago</option><option>Pendente</option><option>Agendado</option><option>Inativo</option><option>Inativa</option><option>Convidado</option></select></div>
   {rows.length===0?<div className="empty-state">Nenhum registro encontrado. Ajuste a pesquisa ou crie um novo cadastro.</div>:rows.map((row,i)=><div className="payable-table-row" key={i}><div><strong>{row['description']||row['name']}</strong><small>{[row['email'],row['category'],row['account'],row['role'],row['document']].filter(Boolean).join(" · ")}</small></div><div className="row-meta">{row['amount']?formatMoney(row['amount']):row['phone']||row['date']||""}{row['status']&&<span className="status-pill">{row['status']}</span>}</div><button className="icon-button" title="Excluir registro desta sessão" onClick={()=>{if(i>= (defaults[title]||[]).length)setRecords(old=>old.filter((_,index)=>index!==i-(defaults[title]||[]).length));else showNotice("Os registros de exemplo não podem ser excluídos.")}}><X size={15}/></button></div>)}
   <div className="demo-disclaimer"><ShieldCheck size={14}/> Dados ilustrativos. Novos registros ficam apenas nesta sessão e não são enviados a um banco de dados.</div></section>}
  {title==="Relatórios"&&<><div className="payable-toolbar"><label>Período <select value={period} onChange={e=>setPeriod(e.target.value)}><option>Este mês</option><option>Últimos 30 dias</option><option>Este trimestre</option><option>Este ano</option></select></label><button className="button-secondary" onClick={()=>showNotice("Exportação estará disponível após a integração de dados.")}><Download size={15}/> Exportar</button></div><div className="summary-grid"><div className="summary-card"><span>Receitas</span><strong>R$ 64.200,00</strong><small>Dados demonstrativos · {period}</small></div><div className="summary-card"><span>Despesas</span><strong>R$ 38.200,00</strong><small>Dados demonstrativos · {period}</small></div><div className="summary-card"><span>Resultado</span><strong>R$ 26.000,00</strong><small>Saldo positivo ilustrativo</small></div></div><section className="panel payable-list-panel"><h2>Demonstrativos disponíveis</h2>{["DRE gerencial","Receitas por categoria","Despesas por centro de custo","Fluxo de caixa projetado","Contas vencidas e a vencer"].map(x=><div className="payable-table-row" key={x}><span>{x}</span><button className="button-secondary" onClick={()=>showNotice("Relatório demonstrativo selecionado. Conecte os dados para gerar o documento.")}>Visualizar</button></div>)}</section></>}
  {title==="NEXUS AI"&&<><section className="panel payable-list-panel"><div className="eyebrow">NEXUS INTELLIGENCE</div><h2>Resumo financeiro inteligente</h2><p>Insights de exemplo baseados nos números ilustrativos do painel.</p><div className="insight-card"><strong>Oportunidade de caixa</strong><p>Revise despesas recorrentes e pagamentos agendados para melhorar a previsibilidade do caixa.</p></div><div className="insight-card"><strong>Atenção aos recebíveis</strong><p>Acompanhe títulos próximos do vencimento e priorize a conciliação dos recebimentos.</p></div><div className="insight-card"><strong>Saúde operacional</strong><p>Organize despesas por centro de custo para identificar os principais direcionadores de gastos.</p></div><div className="demo-disclaimer"><ShieldCheck size={14}/> Assistente demonstrativo: não analisa dados reais nem utiliza um modelo de IA conectado.</div></section><button className="button-primary" onClick={()=>showNotice("A conexão com o serviço de IA será configurada em uma etapa de backend.")}>Configurar assistente</button></>}
  {title==="Assinatura"&&<><div className="summary-grid">{[{name:"Starter",price:"R$ 49",features:"1 empresa · 2 usuários · Financeiro essencial"},{name:"Business",price:"R$ 149",features:"3 empresas · 10 usuários · Relatórios avançados"},{name:"Professional",price:"R$ 299",features:"Empresas ampliadas · 25 usuários · Gestão completa"}].map((p,i)=><div className="summary-card plan-card" key={p.name}><span>{"PLANO"}</span><h2>{p.name}</h2><strong>{p.price}<small>/mês</small></strong><p>{p.features}</p><button className={i===1?"button-primary":"button-secondary"} onClick={()=>showNotice("Planos são ilustrativos. Checkout e cobrança ainda não estão conectados.")}>Selecionar plano</button></div>)}</div><div className="demo-disclaimer">Nenhuma assinatura ou cobrança real será criada nesta demonstração.</div></>}
  {title==="Administração"&&<><div className="summary-grid"><div className="summary-card"><span>Organizações</span><strong>02</strong><small>Contas fictícias de demonstração</small></div><div className="summary-card"><span>Usuários</span><strong>04</strong><small>Perfis ilustrativos</small></div><div className="summary-card"><span>Status da plataforma</span><strong>Demo</strong><small>Sem serviços de produção conectados</small></div></div><section className="panel payable-list-panel"><h2>Controles administrativos</h2>{["Organizações e workspaces","Usuários e permissões","Planos e limites","Auditoria e atividades","Saúde dos serviços"].map(x=><div className="payable-table-row" key={x}>{x}<span className="status-pill">Backend pendente</span></div>)}</section></>}
  {title==="Configurações"&&<section className="panel payable-list-panel"><h2>Preferências do ambiente</h2><form className="settings-form" onSubmit={e=>{e.preventDefault();showNotice("Preferências atualizadas nesta sessão.")}}><label>Idioma<select value={settings.language} onChange={e=>setSettings({...settings,language:e.target.value})}><option>Português (Brasil)</option><option>English</option><option>Español</option></select></label><label>Moeda<select value={settings.currency} onChange={e=>setSettings({...settings,currency:e.target.value})}><option value="BRL">Real (BRL)</option><option value="USD">Dólar (USD)</option><option value="EUR">Euro (EUR)</option></select></label><label>Fuso horário<select value={settings.timezone} onChange={e=>setSettings({...settings,timezone:e.target.value})}><option value="America/Sao_Paulo">Brasília (America/Sao_Paulo)</option><option value="America/Manaus">Manaus (America/Manaus)</option><option value="UTC">UTC</option></select></label><label className="setting-toggle"><input type="checkbox" checked={settings.notifications} onChange={e=>setSettings({...settings,notifications:e.target.checked})}/> Receber notificações no aplicativo</label><button className="button-primary" type="submit">Salvar preferências</button><div className="demo-disclaimer">As preferências não são persistidas após encerrar a sessão.</div></form></section>}
  {open&&<div className="modal-backdrop"><form className="payable-modal" onSubmit={save}><div className="modal-heading"><h2>{heading}</h2><button type="button" onClick={()=>setOpen(false)}>Fechar</button></div>{(fields[title]||[]).map(field=><label key={field.key}>{field.label}{field.options?<select required={field.required} value={draft[field.key]||field.options[0]} onChange={e=>setDraft({...draft,[field.key]:e.target.value})}>{field.options.map(option=><option key={option}>{option}</option>)}</select>:<input required={field.required} type={field.type||"text"} min={field.type==="number"?"0":undefined} step={field.type==="number"?"0.01":undefined} value={draft[field.key]||""} onChange={e=>setDraft({...draft,[field.key]:e.target.value})}/>}</label>)}<div className="modal-actions"><button type="button" className="button-secondary" onClick={()=>setOpen(false)}>Cancelar</button><button type="submit" className="button-primary"><Plus size={15}/> Salvar</button></div></form></div>}
 </div>;
}

function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [active, setActive] = useState("Dashboard");
  const [period, setPeriod] = useState("Últimos 7 meses");
  const [company, setCompany] = useState("Nexus Studio");
  const [companyOpen, setCompanyOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [cookieBanner, setCookieBanner] = useState(false);
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
  const saveCookieChoice = (choice: "necessary" | "all") => {
    window.localStorage.setItem("nexus-cookie-choice", choice);
    setCookieBanner(false);
  };
  const filteredTransactions = useMemo(() => transactions.filter((item) => (item.name + item.detail + item.category).toLowerCase().includes(search.toLowerCase())), [search]);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  if (authLoading) return <main className="nexus-auth"><section className="auth-card"><div className="auth-brand"><div className="auth-brand-mark"><Sparkles size={22}/></div><div><strong>NEXUS</strong><span>FINANCE</span></div></div><p className="auth-intro">Verificando sua sessão segura...</p></section></main>;
  if (!session || recoveryMode) return <AuthScreen recoveryMode={recoveryMode}/>;

  return (
    <div className="nexus-app">
      {mobileOpen && <button className="mobile-scrim" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <img className="brand-logo" src="/nexus-mark.webp" alt="Símbolo NEXUS FINANCE" />
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
          <button className="nav-item" onClick={() => showNotice("Central de ajuda em breve.")}><LifeBuoy size={17}/><span>Central de ajuda</span></button>
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
            <button className="icon-button notification-button" aria-label="Notificações" onClick={() => showNotice("Você está em dia! Nenhuma notificação nova.")}><Bell size={18}/><i/></button>
            <div className="top-avatar" aria-label="Perfil da conta">{(session.user.email || "NF").slice(0, 2).toUpperCase()}</div>
          </div>
        </header>

        <div className="page-content">
          {active === "Dashboard" ? <SupabaseDashboard showNotice={showNotice}/> : active === "Contas a pagar" ? <SupabasePayables showNotice={showNotice}/> : active === "Contas a receber" ? <SupabaseReceivables showNotice={showNotice}/> : active === "Fluxo de caixa" ? <SupabaseCashFlow showNotice={showNotice}/> : active === "Contas bancárias" ? <SupabaseAccounts showNotice={showNotice}/> : active === "Categorias e centros de custo" ? <SupabaseCategories showNotice={showNotice}/> : active === "Privacidade e termos" ? <LegalCenter onNotice={showNotice}/> : <WorkspaceModule title={active} showNotice={showNotice}/>}
        </div>
      </main>
      {notice && <div className="toast" role="status"><Check size={16}/>{notice}</div>}
      {cookieBanner && <section className="cookie-banner" role="dialog" aria-label="Preferências de cookies" aria-live="polite"><div><strong>Suas escolhas de privacidade</strong><p>Usamos apenas armazenamento necessário para esta demonstração. Não ativamos analytics ou publicidade nesta interface. Você pode aceitar apenas o necessário ou salvar a escolha de todos os cookies opcionais, caso venham a ser ativados no futuro.</p><button className="cookie-link" onClick={() => { setActive("Privacidade e termos"); setCookieBanner(false); }}>Ler política de cookies</button></div><div className="cookie-actions"><button className="button-secondary" onClick={() => saveCookieChoice("necessary")}>Rejeitar opcionais</button><button className="button-primary" onClick={() => saveCookieChoice("all")}>Aceitar opcionais</button></div></section>}
    </div>
  );
}
