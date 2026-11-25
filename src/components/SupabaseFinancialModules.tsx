import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Activity, ArrowDownLeft, ArrowUpRight, CalendarDays, Landmark, Plus, RefreshCw, ShieldCheck, Tags, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, Legend } from "recharts";
import { supabase } from "../lib/supabase";
import { formatCnpj, isValidCnpj, normalizeCnpj } from "../lib/cnpj";
import {
  createCategory, createCostCenter, createFinancialAccount, createTransaction, requireWorkspaceId,
  listCategories, listCostCenters, listFinancialAccounts, listTransactions,
  updateTransaction, listBusinessContacts, createBusinessContact, listCompanies, createCompany,\n  listSupplierCompanyLinks, saveSupplierCompanyLinks, listSupplierTransactions,
  type BusinessContact, type Company, type Category, type CostCenter, type FinancialAccount, type Transaction,
} from "../lib/finance-data";

type Notice = (message: string) => void;
const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dateLabel = (value: string | null) => value ? new Date(value + "T12:00:00").toLocaleDateString("pt-BR") : "—";
const today = () => new Date().toISOString().slice(0, 10);
const statusLabel = (item: Transaction) => item.status === "paid" ? "Pago" : item.status === "cancelled" ? "Cancelado" : item.status === "overdue" || (item.due_date && item.due_date < today()) ? "Vencida" : "Pendente";

function useFinanceData(notice: Notice) {
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [centers, setCenters] = useState<CostCenter[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);\n  const [suppliers, setSuppliers] = useState<BusinessContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [a, c, cc, t, co] = await Promise.all([listFinancialAccounts(), listCategories(), listCostCenters(), listTransactions(), listCompanies()]);
      setAccounts(a); setCategories(c); setCenters(cc); setTransactions(t); setCompanies(co);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Não foi possível carregar os dados.";
      setError(message);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void reload();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    void requireWorkspaceId().then((workspaceId) => {
      if (cancelled) return;
      channel = supabase.channel("nexus-finance-" + workspaceId)
        .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: "workspace_id=eq." + workspaceId }, () => void reload())
        .on("postgres_changes", { event: "*", schema: "public", table: "financial_accounts", filter: "workspace_id=eq." + workspaceId }, () => void reload())
        .on("postgres_changes", { event: "*", schema: "public", table: "categories", filter: "workspace_id=eq." + workspaceId }, () => void reload())
        .on("postgres_changes", { event: "*", schema: "public", table: "cost_centers", filter: "workspace_id=eq." + workspaceId }, () => void reload())
        .on("postgres_changes", { event: "*", schema: "public", table: "companies", filter: "workspace_id=eq." + workspaceId }, () => void reload())
        .on("postgres_changes", { event: "*", schema: "public", table: "business_contacts", filter: "workspace_id=eq." + workspaceId }, () => void reload())
        .subscribe();
    }).catch(() => undefined);
    return () => { cancelled = true; if (channel) void supabase.removeChannel(channel); };
  }, [reload]);
  return { accounts, categories, centers, transactions, companies, suppliers, loading, error, reload };
}

function DataState({ loading, error, retry }: { loading: boolean; error: string; retry: () => void }) {
  if (loading) return <div className="panel"><p>Carregando dados do Supabase…</p></div>;
  if (error) return <div className="panel"><p role="alert">{error}</p><button className="button-secondary" onClick={retry}><RefreshCw size={15}/> Tentar novamente</button></div>;
  return null;
}

function TransactionForm({ type, accounts, categories, centers, companies, onClose, onSaved, notice }: {
  type: "income" | "expense"; accounts: FinancialAccount[]; categories: Category[]; centers: CostCenter[]; companies: Company[]; suppliers: BusinessContact[];
  onClose: () => void; onSaved: () => Promise<void>; notice: Notice;
}) {
  const [description, setDescription] = useState("");
  const [counterparty, setCounterparty] = useState("");\n  const [supplierId, setSupplierId] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState(today());
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [centerId, setCenterId] = useState("");
  const [companyId, setCompanyId] = useState(() => typeof window !== "undefined" ? ((window.localStorage.getItem("nexus-active-company") || "") === "all" ? "" : window.localStorage.getItem("nexus-active-company") || "") : "");
  const [saving, setSaving] = useState(false);
  const options = categories.filter((item) => item.type === type);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (companies.length > 0 && (!companyId || companyId === "all")) { notice("Selecione uma empresa para vincular este lançamento."); return; }
    if (!accountId) { notice("Cadastre uma conta financeira antes de lançar movimentações."); return; }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) { notice("Informe um valor maior que zero."); return; }
    setSaving(true);
    try {
      await createTransaction({ account_id: accountId, category_id: categoryId || null, cost_center_id: centerId || null, supplier_id: type === "expense" ? supplierId || null : null,
        company_id: companyId && companyId !== "all" ? companyId : null,
        type, description: description.trim(), counterparty: counterparty.trim() || null, amount: value,
        status: "pending", transaction_date: today(), due_date: due, notes: null });
      await onSaved(); onClose(); notice(type === "expense" ? "Conta a pagar salva no Supabase." : "Conta a receber salva no Supabase.");
    } catch (e) { notice(e instanceof Error ? e.message : "Falha ao salvar movimentação."); }
    finally { setSaving(false); }
  };
  return <div className="modal-backdrop" onClick={onClose}><form className="payable-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
    <div className="modal-heading"><div><h2>{type === "expense" ? "Nova conta a pagar" : "Nova conta a receber"}</h2><p>O registro será salvo na sua conta do Supabase</p></div><button type="button" className="icon-button" onClick={onClose}>×</button></div>
    <label>Empresa<select required={companies.length > 0} value={companyId} onChange={(e) => setCompanyId(e.target.value)}><option value="">Selecione a empresa</option>{companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Descrição<input required value={description} onChange={(e) => setDescription(e.target.value)} maxLength={160}/></label>
    <label>{type === "expense" ? "Fornecedor cadastrado" : "Cliente"}{type === "expense" ? <select value={supplierId} onChange={(e) => { setSupplierId(e.target.value); const selected = suppliers.find((item) => item.id === e.target.value); if (selected) setCounterparty(selected.name); }}><option value="">Sem vínculo com cadastro</option>{suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select> : <input value={counterparty} onChange={(e) => setCounterparty(e.target.value)} maxLength={120}/>}</label>
    <div className="modal-fields"><label>Valor (R$)<input required type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}/></label><label>Vencimento<input required type="date" value={due} onChange={(e) => setDue(e.target.value)}/></label></div>
    <label>Conta financeira<select required value={accountId} onChange={(e) => setAccountId(e.target.value)}>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Categoria<select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">Sem categoria</option>{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Centro de custo<select value={centerId} onChange={(e) => setCenterId(e.target.value)}><option value="">Sem centro de custo</option>{centers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <div className="modal-actions"><button type="button" className="button-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button-primary" disabled={saving}>{saving ? "Salvando…" : "Salvar no banco"}</button></div>
  </form></div>;
}

export function SupabasePayables({ showNotice }: { showNotice: Notice }) {
  const data = useFinanceData(showNotice); const [modal, setModal] = useState(false); const [query, setQuery] = useState("");
  const items = useMemo(() => data.transactions.filter((item) => item.type === "expense").filter((item) => (item.description + (item.counterparty ?? "")).toLowerCase().includes(query.toLowerCase())), [data.transactions, query]);
  const total = items.filter((item) => item.status !== "paid" && item.status !== "cancelled").reduce((sum, item) => sum + Number(item.amount), 0);
  const markPaid = async (item: Transaction) => { try { await updateTransaction(item.id, { status: "paid", paid_at: new Date().toISOString() }); await data.reload(); showNotice("Despesa marcada como paga."); } catch (e) { showNotice(e instanceof Error ? e.message : "Falha ao atualizar."); } };
  return <><div className="welcome-row"><div><div className="eyebrow">FINANCEIRO · SUPABASE</div><h1>Contas a pagar</h1><p>Despesas e compromissos salvos na sua conta.</p></div><button className="button-primary" onClick={() => setModal(true)}><Plus size={16}/> Nova conta</button></div>
    <section className="payable-summary-grid"><article className="metric-card"><div className="metric-top">Total em aberto <Wallet size={17}/></div><div className="metric-value">{money(total)}</div><div className="metric-foot">Registros pendentes</div></article><article className="metric-card"><div className="metric-top">Contas cadastradas <Activity size={17}/></div><div className="metric-value">{items.length}</div><div className="metric-foot">Dados do banco</div></article><article className="metric-card"><div className="metric-top">Vencidas <CalendarDays size={17}/></div><div className="metric-value">{items.filter((item) => statusLabel(item) === "Vencida").length}</div><div className="metric-foot">Com vencimento ultrapassado</div></article></section>
    <DataState loading={data.loading} error={data.error} retry={() => void data.reload()}/>
    {!data.loading && !data.error && <section className="panel payable-list-panel"><div className="payable-toolbar"><input placeholder="Buscar descrição ou fornecedor…" value={query} onChange={(e) => setQuery(e.target.value)}/></div><div className="payable-table"><div className="payable-table-head"><span>DESCRIÇÃO / FORNECEDOR</span><span>VENCIMENTO</span><span>VALOR</span><span>STATUS</span><span>AÇÃO</span></div>{items.map((item) => <div className="payable-table-row" key={item.id}><div><strong>{item.description}</strong><small>{item.counterparty || "Sem fornecedor"}</small></div><span>{dateLabel(item.due_date)}</span><strong>{money(Number(item.amount))}</strong><span>{statusLabel(item)}</span><button className="pay-action" disabled={item.status === "paid"} onClick={() => void markPaid(item)}>{item.status === "paid" ? "Pago" : "Marcar pago"}</button></div>)}{items.length === 0 && <p className="empty-search">Nenhuma conta a pagar cadastrada.</p>}</div><p className="demo-disclaimer"><ShieldCheck size={14}/> Dados carregados e persistidos no Supabase.</p></section>}
    {modal && <TransactionForm type="expense" accounts={data.accounts} categories={data.categories} centers={data.centers} companies={data.companies} suppliers={data.suppliers} onClose={() => setModal(false)} onSaved={data.reload} notice={showNotice}/>}
  </>;
}

export function SupabaseReceivables({ showNotice }: { showNotice: Notice }) {
  const data = useFinanceData(showNotice); const [modal, setModal] = useState(false); const [query, setQuery] = useState("");
  const items = useMemo(() => data.transactions.filter((item) => item.type === "income").filter((item) => (item.description + (item.counterparty ?? "")).toLowerCase().includes(query.toLowerCase())), [data.transactions, query]);
  const total = items.filter((item) => item.status !== "paid" && item.status !== "cancelled").reduce((sum, item) => sum + Number(item.amount), 0);
  const markReceived = async (item: Transaction) => { try { await updateTransaction(item.id, { status: "paid", paid_at: new Date().toISOString() }); await data.reload(); showNotice("Recebimento confirmado."); } catch (e) { showNotice(e instanceof Error ? e.message : "Falha ao atualizar."); } };
  return <><div className="welcome-row"><div><div className="eyebrow">FINANCEIRO · SUPABASE</div><h1>Contas a receber</h1><p>Receitas e cobranças salvas na sua conta.</p></div><button className="button-primary" onClick={() => setModal(true)}><Plus size={16}/> Nova cobrança</button></div>
    <section className="payable-summary-grid"><article className="metric-card"><div className="metric-top">Total a receber <Wallet size={17}/></div><div className="metric-value">{money(total)}</div><div className="metric-foot">Registros pendentes</div></article><article className="metric-card"><div className="metric-top">Cobranças cadastradas <Activity size={17}/></div><div className="metric-value">{items.length}</div><div className="metric-foot">Dados do banco</div></article><article className="metric-card"><div className="metric-top">Em atraso <CalendarDays size={17}/></div><div className="metric-value">{items.filter((item) => statusLabel(item) === "Vencida").length}</div><div className="metric-foot">Com vencimento ultrapassado</div></article></section>
    <DataState loading={data.loading} error={data.error} retry={() => void data.reload()}/>
    {!data.loading && !data.error && <section className="panel payable-list-panel"><div className="payable-toolbar"><input placeholder="Buscar descrição ou cliente…" value={query} onChange={(e) => setQuery(e.target.value)}/></div><div className="payable-table"><div className="payable-table-head"><span>COBRANÇA / CLIENTE</span><span>VENCIMENTO</span><span>VALOR</span><span>STATUS</span><span>AÇÃO</span></div>{items.map((item) => <div className="payable-table-row" key={item.id}><div><strong>{item.description}</strong><small>{item.counterparty || "Sem cliente"}</small></div><span>{dateLabel(item.due_date)}</span><strong>{money(Number(item.amount))}</strong><span>{statusLabel(item)}</span><button className="pay-action" disabled={item.status === "paid"} onClick={() => void markReceived(item)}>{item.status === "paid" ? "Recebido" : "Marcar recebido"}</button></div>)}{items.length === 0 && <p className="empty-search">Nenhuma conta a receber cadastrada.</p>}</div><p className="demo-disclaimer"><ShieldCheck size={14}/> Dados carregados e persistidos no Supabase.</p></section>}
    {modal && <TransactionForm type="income" accounts={data.accounts} categories={data.categories} centers={data.centers} companies={data.companies} onClose={() => setModal(false)} onSaved={data.reload} notice={showNotice}/>}
  </>;
}

export function SupabaseAccounts({ showNotice }: { showNotice: Notice }) {
  const data = useFinanceData(showNotice); const [modal, setModal] = useState(false);
  const [name, setName] = useState(""); const [institution, setInstitution] = useState(""); const [kind, setKind] = useState("checking"); const [balance, setBalance] = useState("0"); const [companyId, setCompanyId] = useState(() => typeof window !== "undefined" ? (window.localStorage.getItem("nexus-active-company") || "") : "");
  const balances = (account: FinancialAccount) => Number(account.opening_balance) + data.transactions.filter((item) => item.account_id === account.id && item.status === "paid").reduce((sum, item) => sum + (item.type === "income" ? Number(item.amount) : -Number(item.amount)), 0);
  const save = async (event: FormEvent) => { event.preventDefault(); if (data.companies.length > 0 && (!companyId || companyId === "all")) { showNotice("Selecione uma empresa para vincular esta conta."); return; } try { await createFinancialAccount({ name, institution: institution || null, company_id: companyId && companyId !== "all" ? companyId : null, account_type: kind, opening_balance: Number(balance), color: "#238bd2", is_active: true }); await data.reload(); setModal(false); setName(""); setInstitution(""); showNotice("Conta financeira salva no Supabase."); } catch (e) { showNotice(e instanceof Error ? e.message : "Falha ao salvar conta."); } };
  return <><div className="welcome-row"><div><div className="eyebrow">FINANCEIRO · SUPABASE</div><h1>Contas financeiras</h1><p>Contas e saldos calculados a partir dos lançamentos efetivados.</p></div><button className="button-primary" onClick={() => setModal(true)}><Plus size={16}/> Nova conta</button></div>
    <DataState loading={data.loading} error={data.error} retry={() => void data.reload()}/>
    {!data.loading && !data.error && <><section className="account-total-card"><div><span>Saldo consolidado</span><strong>{money(data.accounts.reduce((sum, item) => sum + balances(item), 0))}</strong><small>Soma dos saldos das contas ativas</small></div><Landmark size={28}/></section><section className="financial-account-grid">{data.accounts.map((item) => <article className="financial-account-card" key={item.id}><div className="financial-account-top"><span className="account-bank-icon"><Landmark size={19}/></span><span className="account-kind">{item.account_type}</span></div><div className="account-bank-name">{item.institution || "Instituição não informada"}</div><h3>{item.name}</h3><div className="account-balance-label">Saldo calculado</div><strong className="account-balance">{money(balances(item))}</strong></article>)}</section>{data.accounts.length === 0 && <div className="panel">Nenhuma conta cadastrada ainda.</div>}</>}
    {modal && <div className="modal-backdrop" onClick={() => setModal(false)}><form className="payable-modal" onClick={(e) => e.stopPropagation()} onSubmit={save}><div className="modal-heading"><h2>Nova conta financeira</h2><button type="button" onClick={() => setModal(false)}>×</button></div><label>Empresa<select required={data.companies.length > 0} value={companyId} onChange={(e) => setCompanyId(e.target.value)}><option value="">Selecione a empresa</option>{data.companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Nome<input required value={name} onChange={(e) => setName(e.target.value)}/></label><label>Banco / instituição<input value={institution} onChange={(e) => setInstitution(e.target.value)}/></label><label>Tipo<select value={kind} onChange={(e) => setKind(e.target.value)}><option value="checking">Conta corrente</option><option value="savings">Poupança</option><option value="cash">Dinheiro em caixa</option><option value="credit_card">Cartão de crédito</option><option value="investment">Investimento</option><option value="other">Outra</option></select></label><label>Saldo inicial<input required type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)}/></label><div className="modal-actions"><button type="button" className="button-secondary" onClick={() => setModal(false)}>Cancelar</button><button className="button-primary" type="submit">Salvar conta</button></div></form></div>}
  </>;
}

export function SupabaseCategories({ showNotice }: { showNotice: Notice }) {
  const data = useFinanceData(showNotice); const [tab, setTab] = useState<"categories" | "centers">("categories");
  const [name, setName] = useState(""); const [type, setType] = useState<"income" | "expense">("expense"); const [description, setDescription] = useState(""); const [modal, setModal] = useState(false);
  const save = async (event: FormEvent) => { event.preventDefault(); try { if (tab === "categories") await createCategory({ name, type, color: "#278bd1", icon: null, is_default: false }); else await createCostCenter({ name, description: description || null, color: "#278bd1" }); await data.reload(); setName(""); setDescription(""); setModal(false); showNotice("Cadastro salvo no Supabase."); } catch (e) { showNotice(e instanceof Error ? e.message : "Falha ao salvar cadastro."); } };
  return <><div className="welcome-row"><div><div className="eyebrow">GESTÃO · SUPABASE</div><h1>Categorias e centros de custo</h1><p>Classificações e departamentos persistidos no banco.</p></div><button className="button-primary" onClick={() => setModal(true)}><Plus size={16}/> Novo cadastro</button></div>
    <div className="category-tabs"><button className={tab === "categories" ? "active" : ""} onClick={() => setTab("categories")}><Tags size={15}/> Categorias</button><button className={tab === "centers" ? "active" : ""} onClick={() => setTab("centers")}>Centros de custo</button></div>
    <DataState loading={data.loading} error={data.error} retry={() => void data.reload()}/>
    {!data.loading && !data.error && (tab === "categories" ? <section className="panel payable-list-panel"><h2>Categorias ({data.categories.length})</h2>{data.categories.map((item) => <div className="payable-table-row" key={item.id}><strong>{item.name}</strong><span>{item.type === "income" ? "Receita" : "Despesa"}</span></div>)}{data.categories.length === 0 && <p>Nenhuma categoria cadastrada.</p>}</section> : <section className="panel payable-list-panel"><h2>Centros de custo ({data.centers.length})</h2>{data.centers.map((item) => <div className="payable-table-row" key={item.id}><strong>{item.name}</strong><span>{item.description || "Sem descrição"}</span></div>)}{data.centers.length === 0 && <p>Nenhum centro de custo cadastrado.</p>}</section>)}
    {modal && <div className="modal-backdrop" onClick={() => setModal(false)}><form className="payable-modal" onClick={(e) => e.stopPropagation()} onSubmit={save}><div className="modal-heading"><h2>{tab === "categories" ? "Nova categoria" : "Novo centro de custo"}</h2><button type="button" onClick={() => setModal(false)}>×</button></div><label>Nome<input required value={name} onChange={(e) => setName(e.target.value)}/></label>{tab === "categories" ? <label>Tipo<select value={type} onChange={(e) => setType(e.target.value as "income" | "expense")}><option value="expense">Despesa</option><option value="income">Receita</option></select></label> : <label>Descrição<input value={description} onChange={(e) => setDescription(e.target.value)}/></label>}<div className="modal-actions"><button type="button" className="button-secondary" onClick={() => setModal(false)}>Cancelar</button><button type="submit" className="button-primary">Salvar</button></div></form></div>}
  </>;
}

export function SupabaseCashFlow({ showNotice }: { showNotice: Notice }) {
  const data = useFinanceData(showNotice);
  const settled = data.transactions.filter((item) => item.status === "paid");
  const income = settled.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0);
  const expense = settled.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount), 0);
  const pending = data.transactions.filter((item) => item.status === "pending" || item.status === "overdue");
  const forecastIncome = pending.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0);
  const forecastExpense = pending.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount), 0);
  const opening = data.accounts.reduce((sum, item) => sum + Number(item.opening_balance), 0);
  return <><div className="welcome-row"><div><div className="eyebrow">FINANCEIRO · SUPABASE</div><h1>Fluxo de caixa</h1><p>Entradas, saídas e compromissos registrados no banco.</p></div><button className="button-secondary" onClick={() => void data.reload()}><RefreshCw size={15}/> Atualizar</button></div>
    <DataState loading={data.loading} error={data.error} retry={() => void data.reload()}/>
    {!data.loading && !data.error && <><section className="payable-summary-grid cashflow-metrics"><article className="metric-card"><div className="metric-top">Saldo de abertura <Wallet size={17}/></div><div className="metric-value">{money(opening)}</div></article><article className="metric-card"><div className="metric-top">Entradas pagas <ArrowDownLeft size={17}/></div><div className="metric-value">{money(income)}</div></article><article className="metric-card"><div className="metric-top">Saídas pagas <ArrowUpRight size={17}/></div><div className="metric-value">{money(expense)}</div></article><article className="metric-card"><div className="metric-top">Saldo calculado <Activity size={17}/></div><div className="metric-value">{money(opening + income - expense)}</div></article></section><section className="panel payable-list-panel"><h2>Projeção pendente</h2><div className="summary-line"><span>Entradas previstas</span><strong>{money(forecastIncome)}</strong></div><div className="summary-line"><span>Saídas previstas</span><strong>{money(forecastExpense)}</strong></div><div className="summary-footer"><span>Saldo projetado</span><strong>{money(opening + income - expense + forecastIncome - forecastExpense)}</strong></div><h2>Movimentações</h2>{data.transactions.map((item) => <div className="payable-table-row" key={item.id}><div><strong>{item.description}</strong><small>{item.counterparty || "—"}</small></div><span>{dateLabel(item.transaction_date)}</span><span>{item.type === "income" ? "Entrada" : "Saída"}</span><strong>{money(Number(item.amount))}</strong><span>{statusLabel(item)}</span></div>)}{data.transactions.length === 0 && <p>Nenhuma movimentação registrada.</p>}</section></>}
  </>;
}


export function SupabaseDashboard({ showNotice }: { showNotice: Notice }) {
  const data = useFinanceData(showNotice);
  const [period, setPeriod] = useState("6");
  const [chartMode, setChartMode] = useState<"both" | "income" | "expense">("both");
  const paid = data.transactions.filter((item) => item.status === "paid");
  const now = new Date();
  const month = today().slice(0, 7);
  const monthPaid = paid.filter((item) => (item.paid_at ?? item.transaction_date).startsWith(month));
  const income = monthPaid.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0);
  const expense = monthPaid.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount), 0);
  const balance = data.accounts.reduce((sum, item) => sum + Number(item.opening_balance), 0) +
    paid.reduce((sum, item) => sum + (item.type === "income" ? Number(item.amount) : -Number(item.amount)), 0);
  const pending = data.transactions.filter((item) => item.status !== "paid" && item.status !== "cancelled");
  const pendingIncome = pending.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0);
  const pendingExpense = pending.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount), 0);
  const overdue = pending.filter((item) => item.due_date && item.due_date < today());
  const cutoff = new Date(now.getFullYear(), now.getMonth() - Number(period) + 1, 1);
  const periodTransactions = paid.filter((item) => {
    const date = new Date((item.paid_at ?? item.transaction_date) + "T12:00:00");
    return date >= cutoff;
  });
  const chartData = Array.from({ length: Number(period) }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - Number(period) + 1 + index, 1);
    const key = date.toISOString().slice(0, 7);
    const monthItems = periodTransactions.filter((item) => (item.paid_at ?? item.transaction_date).startsWith(key));
    return {
      month: date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      receitas: monthItems.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0),
      despesas: monthItems.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount), 0),
    };
  });
  const categoryTotals = data.categories.map((category) => ({
    name: category.name,
    value: periodTransactions.filter((item) => item.type === "expense" && item.category_id === category.id)
      .reduce((sum, item) => sum + Number(item.amount), 0),
  })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value).slice(0, 6);
  const upcoming = pending.sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? "")).slice(0, 5);
  const colors = ["#159b78", "#4b91c8", "#e6a34b", "#8d75c7", "#d87878", "#6b9caa"];
  return <><div className="welcome-row"><div><div className="eyebrow">VISÃO GERAL · DADOS REAIS</div><h1>Bem-vindo ao NEXUS</h1><p>Indicadores, tendências e compromissos da sua gestão financeira.</p></div><div className="welcome-actions"><button className="button-secondary" onClick={() => void data.reload()}><RefreshCw size={15}/> Atualizar dados</button></div></div>
    <DataState loading={data.loading} error={data.error} retry={() => void data.reload()}/>
    {!data.loading && !data.error && <>
      <section className="metrics-grid">
        <article className="metric-card balance-card"><div className="metric-top">Saldo consolidado <Wallet size={17}/></div><div className="metric-value">{money(balance)}</div><div className="metric-foot">{data.accounts.length} contas financeiras</div></article>
        <article className="metric-card"><div className="metric-top">Receitas recebidas <ArrowDownLeft size={17}/></div><div className="metric-value">{money(income)}</div><div className="metric-foot">Neste mês</div></article>
        <article className="metric-card"><div className="metric-top">Despesas pagas <ArrowUpRight size={17}/></div><div className="metric-value">{money(expense)}</div><div className="metric-foot">Neste mês</div></article>
        <article className="metric-card"><div className="metric-top">Resultado do mês <Activity size={17}/></div><div className="metric-value">{money(income - expense)}</div><div className="metric-foot">Receitas menos despesas pagas</div></article>
      </section>
      <section className="summary-grid dashboard-extra-metrics">
        <div className="summary-card"><span>A receber</span><strong>{money(pendingIncome)}</strong><small><TrendingUp size={13}/> {pending.filter((item) => item.type === "income").length} cobranças em aberto</small></div>
        <div className="summary-card"><span>A pagar</span><strong>{money(pendingExpense)}</strong><small><TrendingDown size={13}/> {pending.filter((item) => item.type === "expense").length} contas em aberto</small></div>
        <div className="summary-card"><span>Contas vencidas</span><strong>{overdue.length}</strong><small>Precisam de atenção</small></div>
        <div className="summary-card"><span>Movimentações</span><strong>{data.transactions.length}</strong><small>Registros na sua conta</small></div>
      </section>
      <section className="panel dashboard-chart-panel">
        <div className="panel-heading dashboard-chart-heading"><div><h2>Evolução financeira</h2><p>Comparativo de receitas e despesas pagas</p></div>
          <div className="dashboard-chart-controls"><select aria-label="Período do gráfico" value={period} onChange={(event) => setPeriod(event.target.value)}><option value="3">3 meses</option><option value="6">6 meses</option><option value="12">12 meses</option></select><select aria-label="Séries exibidas" value={chartMode} onChange={(event) => setChartMode(event.target.value as typeof chartMode)}><option value="both">Receitas e despesas</option><option value="income">Só receitas</option><option value="expense">Só despesas</option></select></div>
        </div>
        <div className="dashboard-main-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}><defs><linearGradient id="nexusIncomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#159b78" stopOpacity={0.25}/><stop offset="95%" stopColor="#159b78" stopOpacity={0.01}/></linearGradient><linearGradient id="nexusExpenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e6a34b" stopOpacity={0.22}/><stop offset="95%" stopColor="#e6a34b" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dce7e5"/><XAxis dataKey="month" tickLine={false} axisLine={false}/><YAxis tickLine={false} axisLine={false} width={66} tickFormatter={(value) => value >= 1000 ? "R$ " + (value / 1000).toFixed(0) + "k" : String(value)}/><Tooltip formatter={(value) => money(Number(value))}/>{chartMode !== "expense" && <Area type="monotone" dataKey="receitas" name="Receitas" stroke="#159b78" strokeWidth={2.5} fill="url(#nexusIncomeFill)" activeDot={{ r: 5 }}/>}{chartMode !== "income" && <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#e6a34b" strokeWidth={2.5} fill="url(#nexusExpenseFill)" activeDot={{ r: 5 }}/>}</AreaChart></ResponsiveContainer></div>
        <div className="dashboard-chart-foot"><span><i className="chart-dot chart-dot-income"/> Receitas pagas</span><span><i className="chart-dot chart-dot-expense"/> Despesas pagas</span><small>Somente lançamentos com status pago.</small></div>
      </section>
      <section className="bottom-grid dashboard-insights-grid">
        <article className="panel"><div className="panel-heading"><div><h2>Despesas por categoria</h2><p>Distribuição no período selecionado</p></div></div>
          {categoryTotals.length ? <><div className="dashboard-donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryTotals} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={3}>{categoryTotals.map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]}/>)}</Pie><Tooltip formatter={(value) => money(Number(value))}/><Legend verticalAlign="bottom" height={38}/></PieChart></ResponsiveContainer></div><div className="dashboard-category-list">{categoryTotals.map((item, index) => <div key={item.name}><i style={{ background: colors[index % colors.length] }}/><span>{item.name}</span><strong>{money(item.value)}</strong></div>)}</div></> : <p className="dashboard-empty">Ainda não há despesas pagas com categoria no período.</p>}
        </article>
        <article className="panel payables-panel"><div className="panel-heading"><div><h2>Próximos vencimentos</h2><p>Compromissos ainda em aberto</p></div></div>
          {upcoming.map((item) => <div className="due-item" key={item.id}><div className="due-copy"><strong>{item.description}</strong><small>{dateLabel(item.due_date)} · {statusLabel(item)}</small></div><div className="due-value"><strong>{money(Number(item.amount))}</strong></div></div>)}
          {upcoming.length === 0 && <p>Nenhum vencimento pendente.</p>}
        </article>
      </section>
      <section className="panel transactions-panel dashboard-recent-panel"><div className="panel-heading"><div><h2>Transações recentes</h2><p>Últimos lançamentos cadastrados</p></div></div>
        {data.transactions.slice(0, 6).map((item) => <div className="payable-table-row" key={item.id}><div><strong>{item.description}</strong><small>{item.counterparty || "—"}</small></div><span>{dateLabel(item.transaction_date)}</span><span>{item.type === "income" ? "Entrada" : "Saída"}</span><strong className={item.type === "income" ? "amount-in" : "amount-out"}>{money(Number(item.amount))}</strong></div>)}
        {data.transactions.length === 0 && <p>Nenhuma movimentação cadastrada. Comece criando uma conta financeira e depois registre suas receitas e despesas.</p>}
      </section>
      <p className="demo-disclaimer"><ShieldCheck size={14}/> Indicadores calculados exclusivamente com os dados da sua conta no Supabase. Sem números de demonstração.</p>
    </>}
  </>;
}

export function SupabaseTransactions({ showNotice }: { showNotice: Notice }) {
  const data = useFinanceData(showNotice);
  return <><div className="welcome-row"><div><div className="eyebrow">FINANCEIRO · SUPABASE</div><h1>Transações</h1><p>Todos os lançamentos da sua conta em um só lugar.</p></div><button className="button-secondary" onClick={() => void data.reload()}><RefreshCw size={15}/> Atualizar</button></div>
    <DataState loading={data.loading} error={data.error} retry={() => void data.reload()}/>
    {!data.loading && !data.error && <section className="panel payable-list-panel"><div className="panel-heading"><div><h2>{data.transactions.length} lançamento(s)</h2><p>Registros reais protegidos por RLS</p></div></div>
      {data.transactions.map((item) => <div className="payable-table-row" key={item.id}><div><strong>{item.description}</strong><small>{item.counterparty || "—"}</small></div><span>{dateLabel(item.transaction_date)}</span><span>{item.type === "income" ? "Receita" : "Despesa"}</span><strong>{money(Number(item.amount))}</strong><span>{statusLabel(item)}</span></div>)}
      {data.transactions.length === 0 && <p>Nenhuma transação cadastrada ainda.</p>}
    </section>}
  </>;
}

export function SupabaseReports({ showNotice }: { showNotice: Notice }) {
  const data = useFinanceData(showNotice);
  const paid = data.transactions.filter((item) => item.status === "paid");
  const income = paid.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0);
  const expense = paid.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount), 0);
  const openIncome = data.transactions.filter((item) => item.type === "income" && item.status !== "paid" && item.status !== "cancelled").reduce((sum, item) => sum + Number(item.amount), 0);
  const openExpense = data.transactions.filter((item) => item.type === "expense" && item.status !== "paid" && item.status !== "cancelled").reduce((sum, item) => sum + Number(item.amount), 0);
  return <><div className="welcome-row"><div><div className="eyebrow">GESTÃO · SUPABASE</div><h1>Relatórios</h1><p>Demonstrativos calculados com os seus lançamentos.</p></div><button className="button-secondary" onClick={() => showNotice("A exportação PDF/Excel será adicionada após validar os demonstrativos.")}><RefreshCw size={15}/> Atualizar</button></div>
    <DataState loading={data.loading} error={data.error} retry={() => void data.reload()}/>
    {!data.loading && !data.error && <><section className="summary-grid"><div className="summary-card"><span>Receitas realizadas</span><strong>{money(income)}</strong><small>Todos os lançamentos pagos</small></div><div className="summary-card"><span>Despesas realizadas</span><strong>{money(expense)}</strong><small>Todos os lançamentos pagos</small></div><div className="summary-card"><span>Resultado realizado</span><strong>{money(income - expense)}</strong><small>Receitas menos despesas</small></div></section><section className="panel payable-list-panel"><h2>Posição financeira</h2><div className="summary-line"><span>Recebimentos pendentes</span><strong>{money(openIncome)}</strong></div><div className="summary-line"><span>Pagamentos pendentes</span><strong>{money(openExpense)}</strong></div><div className="summary-footer"><span>Contas cadastradas</span><strong>{data.transactions.length}</strong></div><div className="demo-disclaimer"><ShieldCheck size={14}/> Relatório calculado em tempo real a partir do Supabase; sem valores fictícios.</div></section></>}
  </>;
}


export function SupabaseContacts({ contactType, showNotice }: { contactType: "customer" | "supplier"; showNotice: Notice }) {
  const [items, setItems] = useState<BusinessContact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [links, setLinks] = useState<{ supplier_id: string; company_id: string }[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [selected, setSelected] = useState<BusinessContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(""); const [document, setDocument] = useState("");
  const [email, setEmail] = useState(""); const [phone, setPhone] = useState("");
  const [contactPerson, setContactPerson] = useState(""); const [stateRegistration, setStateRegistration] = useState("");
  const [postalCode, setPostalCode] = useState(""); const [street, setStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState(""); const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState(""); const [city, setCity] = useState(""); const [state, setState] = useState("");
  const [website, setWebsite] = useState(""); const [notes, setNotes] = useState("");
  const [companyIds, setCompanyIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const title = contactType === "customer" ? "Clientes" : "Fornecedores";
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (contactType === "supplier") {
        const [contacts, companyList, companyLinks] = await Promise.all([listBusinessContacts("supplier", true), listCompanies(), listSupplierCompanyLinks()]);
        setItems(contacts); setCompanies(companyList); setLinks(companyLinks);
      } else setItems(await listBusinessContacts("customer"));
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao carregar contatos."); }
    finally { setLoading(false); }
  }, [contactType]);
  useEffect(() => { void load(); }, [load]);
  const reset = () => { setName(""); setDocument(""); setEmail(""); setPhone(""); setContactPerson(""); setStateRegistration(""); setPostalCode(""); setStreet(""); setAddressNumber(""); setComplement(""); setNeighborhood(""); setCity(""); setState(""); setWebsite(""); setNotes(""); setCompanyIds([]); };
  const openSupplier = async (item: BusinessContact) => {
    setSelected(item); setHistory([]);
    if (contactType === "supplier") {
      try { setHistory(await listSupplierTransactions(item.id)); }
      catch (e) { showNotice(e instanceof Error ? e.message : "Não foi possível carregar o histórico."); }
    }
  };
  const save = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      const created = await createBusinessContact({
        contact_type: contactType, name: name.trim(), document: document.trim() || null,
        email: email.trim() || null, phone: phone.trim() || null, status: "active", notes: notes.trim() || null,
        company_id: contactType === "supplier" ? null : undefined,
        ...(contactType === "supplier" ? { contact_person: contactPerson.trim() || null, state_registration: stateRegistration.trim() || null,
          postal_code: postalCode.trim() || null, street_address: street.trim() || null, address_number: addressNumber.trim() || null,
          address_complement: complement.trim() || null, neighborhood: neighborhood.trim() || null, city: city.trim() || null,
          state: state.trim().toUpperCase() || null, website: website.trim() || null } : {})
      } as any);
      if (contactType === "supplier") await saveSupplierCompanyLinks(created.id, companyIds);
      await load(); setModal(false); reset(); showNotice(contactType === "supplier" ? "Fornecedor cadastrado e vinculado às empresas no Supabase." : "Contato salvo no Supabase.");
    } catch (e) { showNotice(e instanceof Error ? e.message : "Falha ao salvar contato."); }
    finally { setSaving(false); }
  };
  const filtered = items.filter(item => (item.name + " " + (item.document ?? "") + " " + (item.email ?? "")).toLowerCase().includes(query.toLowerCase()));
  const paidTotal = history.filter(item => item.status === "paid").reduce((sum, item) => sum + Number(item.amount), 0);
  const openTotal = history.filter(item => item.status !== "paid" && item.status !== "cancelled").reduce((sum, item) => sum + Number(item.amount), 0);
  const overdue = history.filter(item => item.status !== "paid" && item.status !== "cancelled" && item.due_date && item.due_date < today()).reduce((sum, item) => sum + Number(item.amount), 0);
  const supplierCompanyNames = (id: string) => links.filter(link => link.supplier_id === id).map(link => companies.find(company => company.id === link.company_id)?.name).filter(Boolean);
  return <><div className="welcome-row"><div><div className="eyebrow">GESTÃO · DADOS REAIS</div><h1>{title}</h1><p>{contactType === "supplier" ? "Cadastro centralizado, compartilhado entre empresas e conectado às contas a pagar." : "Cadastros vinculados à sua conta e protegidos por RLS."}</p></div><button className="button-primary" onClick={() => { reset(); setModal(true); }}><Plus size={16}/> Novo {contactType === "customer" ? "cliente" : "fornecedor"}</button></div>
    {contactType === "supplier" && <div className="payable-toolbar"><input placeholder="Buscar fornecedor por nome, documento ou e-mail…" value={query} onChange={e => setQuery(e.target.value)}/></div>}
    {loading ? <div className="panel">Carregando contatos…</div> : error ? <div className="panel"><p role="alert">{error}</p><button className="button-secondary" onClick={() => void load()}>Tentar novamente</button></div> : <section className="panel payable-list-panel"><h2>{filtered.length} cadastro(s)</h2>{filtered.map(item => <button type="button" className="payable-table-row supplier-list-item" key={item.id} onClick={() => void openSupplier(item)}><div><strong>{item.name}</strong><small>{[item.document, item.email, item.phone].filter(Boolean).join(" · ")}</small>{contactType === "supplier" && <small>Empresas: {supplierCompanyNames(item.id).join(", ") || "Ainda não vinculado"}</small>}</div><span>{item.status === "active" ? "Ativo" : "Inativo"}</span>{contactType === "supplier" && <span>Ver ficha →</span>}</button>)}{filtered.length === 0 && <p>Nenhum cadastro encontrado.</p>}</section>}
    {selected && contactType === "supplier" && <section className="panel supplier-detail-panel"><div className="modal-heading"><div><h2>{selected.name}</h2><p>Ficha do fornecedor · histórico financeiro real</p></div><button type="button" className="icon-button" onClick={() => setSelected(null)}>×</button></div>
      <div className="payable-summary-grid"><article className="metric-card"><div className="metric-top">Total pago</div><div className="metric-value">{money(paidTotal)}</div></article><article className="metric-card"><div className="metric-top">Em aberto</div><div className="metric-value">{money(openTotal)}</div></article><article className="metric-card"><div className="metric-top">Vencido</div><div className="metric-value">{money(overdue)}</div></article></div>
      <p><strong>Documento:</strong> {selected.document || "Não informado"} · <strong>Contato:</strong> {selected.contact_person || "Não informado"}</p>
      <p><strong>Empresas:</strong> {supplierCompanyNames(selected.id).join(", ") || "Nenhuma empresa vinculada"}</p>
      <p><strong>Endereço:</strong> {[selected.street_address, selected.address_number, selected.address_complement, selected.neighborhood, selected.city, selected.state, selected.postal_code].filter(Boolean).join(", ") || "Não informado"}</p>
      <p><strong>Observações:</strong> {selected.notes || "Nenhuma observação"}</p>
      <h3>Histórico de contas a pagar</h3>{history.map(item => <div className="payable-table-row" key={item.id}><div><strong>{item.description}</strong><small>{companies.find(company => company.id === item.company_id)?.name || "Empresa não informada"} · vencimento {dateLabel(item.due_date)}</small></div><strong>{money(Number(item.amount))}</strong><span>{item.status === "paid" ? "Pago" : item.due_date && item.due_date < today() ? "Vencido" : "Em aberto"}</span></div>)}{history.length === 0 && <p>Nenhuma conta a pagar vinculada a este fornecedor ainda.</p>}
    </section>}
    {modal && <div className="modal-backdrop" onClick={() => !saving && setModal(false)}><form className="payable-modal supplier-form-modal" onClick={e => e.stopPropagation()} onSubmit={save}><div className="modal-heading"><div><h2>Novo {contactType === "customer" ? "cliente" : "fornecedor"}</h2><p>{contactType === "supplier" ? "Uma ficha pode atender várias empresas." : "Dados de contato"}</p></div><button type="button" onClick={() => setModal(false)} disabled={saving}>×</button></div>
      <label>Nome / razão social<input required maxLength={180} value={name} onChange={e => setName(e.target.value)}/></label>
      <label>CPF / CNPJ<input value={document} onChange={e => setDocument(e.target.value)} maxLength={24}/></label>
      <div className="modal-fields"><label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)}/></label><label>Telefone<input value={phone} onChange={e => setPhone(e.target.value)}/></label></div>
      {contactType === "supplier" && <><label>Responsável / contato<input value={contactPerson} onChange={e => setContactPerson(e.target.value)}/></label><label>Inscrição estadual<input value={stateRegistration} onChange={e => setStateRegistration(e.target.value)}/></label>
        <div className="modal-fields"><label>CEP<input value={postalCode} onChange={e => setPostalCode(e.target.value)}/></label><label>UF<input maxLength={2} value={state} onChange={e => setState(e.target.value.toUpperCase())}/></label></div>
        <label>Logradouro<input value={street} onChange={e => setStreet(e.target.value)}/></label><div className="modal-fields"><label>Número<input value={addressNumber} onChange={e => setAddressNumber(e.target.value)}/></label><label>Complemento<input value={complement} onChange={e => setComplement(e.target.value)}/></label></div>
        <div className="modal-fields"><label>Bairro<input value={neighborhood} onChange={e => setNeighborhood(e.target.value)}/></label><label>Cidade<input value={city} onChange={e => setCity(e.target.value)}/></label></div>
        <label>Site<input type="url" placeholder="https://" value={website} onChange={e => setWebsite(e.target.value)}/></label>
        <fieldset><legend>Empresas atendidas</legend>{companies.map(company => <label className="supplier-company-option" key={company.id}><input type="checkbox" checked={companyIds.includes(company.id)} onChange={e => setCompanyIds(old => e.target.checked ? [...old, company.id] : old.filter(id => id !== company.id))}/>{company.name}</label>)}{companies.length === 0 && <small>Cadastre uma empresa para vincular fornecedores.</small>}</fieldset>
      </>}
      <label>Observações<textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}/></label>
      <div className="modal-actions"><button type="button" className="button-secondary" onClick={() => setModal(false)} disabled={saving}>Cancelar</button><button type="submit" className="button-primary" disabled={saving}>{saving ? "Salvando…" : "Salvar cadastro"}</button></div>
    </form></div>}
  </>;
}

export function SupabaseCompanies({ showNotice }: { showNotice: Notice }) {
  const [items, setItems] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(""); const [legalName, setLegalName] = useState("");
  const [document, setDocument] = useState(""); const [stateRegistration, setStateRegistration] = useState("");
  const [email, setEmail] = useState(""); const [phone, setPhone] = useState("");
  const [postalCode, setPostalCode] = useState(""); const [street, setStreet] = useState("");
  const [number, setNumber] = useState(""); const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState(""); const [city, setCity] = useState(""); const [state, setState] = useState("");
  const [cnpjError, setCnpjError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { setItems(await listCompanies()); } catch (e) { setError(e instanceof Error ? e.message : "Falha ao carregar empresas."); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const reset = () => { setName(""); setLegalName(""); setDocument(""); setStateRegistration(""); setEmail(""); setPhone(""); setPostalCode(""); setStreet(""); setNumber(""); setComplement(""); setNeighborhood(""); setCity(""); setState(""); setCnpjError(""); };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizeCnpj(document);
    if (normalized && !isValidCnpj(normalized)) { setCnpjError("CNPJ inválido. Confira os 14 caracteres e os dígitos verificadores."); return; }
    if (normalized && items.some((item) => normalizeCnpj(item.document ?? "") === normalized)) { setCnpjError("Este CNPJ já está cadastrado neste workspace."); return; }
    setSaving(true);
    try {
      await createCompany({ name: name.trim(), legal_name: legalName.trim() || null, document: normalized || null,
        state_registration: stateRegistration.trim() || null, email: email.trim() || null, phone: phone.trim() || null,
        postal_code: postalCode.trim() || null, street_address: street.trim() || null, address_number: number.trim() || null,
        address_complement: complement.trim() || null, neighborhood: neighborhood.trim() || null,
        city: city.trim() || null, state: state.trim().toUpperCase() || null,
        status: "active", is_default: items.length === 0 } as any);
      await load(); window.dispatchEvent(new Event("nexus-companies-updated")); setModal(false); reset(); showNotice("Empresa cadastrada com CNPJ validado e salva no Supabase.");
    } catch (e) { showNotice(e instanceof Error ? e.message : "Falha ao salvar empresa."); }
    finally { setSaving(false); }
  };
  const selected = typeof window !== "undefined" ? window.localStorage.getItem("nexus-active-company") : null;
  return <><div className="welcome-row"><div><div className="eyebrow">GESTÃO · DADOS REAIS</div><h1>Empresas</h1><p>Cadastre várias empresas no mesmo workspace e mantenha os lançamentos separados.</p></div><button className="button-primary" onClick={() => setModal(true)}><Plus size={16}/> Nova empresa</button></div>
    <section className="summary-grid"><div className="summary-card"><span>Empresas cadastradas</span><strong>{items.length}</strong><small>Registros reais deste workspace</small></div><div className="summary-card"><span>Visão financeira</span><strong>Consolidada</strong><small>Use o seletor no topo para filtrar uma empresa</small></div></section>
    {loading ? <div className="panel">Carregando empresas…</div> : error ? <div className="panel"><p role="alert">{error}</p><button className="button-secondary" onClick={() => void load()}>Tentar novamente</button></div> : <section className="panel payable-list-panel"><h2>{items.length} empresa(s)</h2>{items.map((item) => <div className="payable-table-row company-record-row" key={item.id}><div><strong>{item.name}</strong><small>{[item.legal_name, item.document ? formatCnpj(item.document) : null, item.city, item.state, item.email].filter(Boolean).join(" · ")}</small></div><span>{selected === item.id ? "Selecionada" : item.is_default ? "Principal" : "Ativa"}</span></div>)}{items.length === 0 && <p>Nenhuma empresa cadastrada. Cadastre a primeira para começar.</p>}</section>}
    {modal && <div className="modal-backdrop" onClick={() => !saving && setModal(false)}><form className="payable-modal company-form-modal" onClick={(e) => e.stopPropagation()} onSubmit={save}><div className="modal-heading"><div><h2>Nova empresa</h2><p>Dados cadastrais e endereço</p></div><button type="button" onClick={() => setModal(false)} disabled={saving}>×</button></div>
      <label>Nome fantasia<input required maxLength={160} value={name} onChange={(e) => setName(e.target.value)}/></label>
      <label>Razão social<input maxLength={200} value={legalName} onChange={(e) => setLegalName(e.target.value)}/></label>
      <label>CNPJ<input required value={formatCnpj(document)} onChange={(e) => { const value = normalizeCnpj(e.target.value); setDocument(value); setCnpjError(value && value.length === 14 && !isValidCnpj(value) ? "CNPJ inválido: dígitos verificadores não conferem." : ""); }} placeholder="00.000.000/0000-00" maxLength={18} autoComplete="off"/>{cnpjError && <small className="field-error" role="alert">{cnpjError}</small>}<small>Compatível com CNPJ numérico e alfanumérico.</small></label>
      <label>Inscrição estadual<input maxLength={40} value={stateRegistration} onChange={(e) => setStateRegistration(e.target.value)}/></label>
      <div className="modal-fields"><label>E-mail<input type="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)}/></label><label>Telefone<input type="tel" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)}/></label></div>
      <div className="modal-fields"><label>CEP<input maxLength={9} value={postalCode} onChange={(e) => setPostalCode(e.target.value)}/></label><label>UF<input maxLength={2} value={state} onChange={(e) => setState(e.target.value.toUpperCase())}/></label></div>
      <label>Logradouro<input maxLength={180} value={street} onChange={(e) => setStreet(e.target.value)}/></label>
      <div className="modal-fields"><label>Número<input maxLength={20} value={number} onChange={(e) => setNumber(e.target.value)}/></label><label>Complemento<input maxLength={80} value={complement} onChange={(e) => setComplement(e.target.value)}/></label></div>
      <div className="modal-fields"><label>Bairro<input maxLength={100} value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)}/></label><label>Cidade<input maxLength={100} value={city} onChange={(e) => setCity(e.target.value)}/></label></div>
      <div className="modal-actions"><button type="button" className="button-secondary" onClick={() => setModal(false)} disabled={saving}>Cancelar</button><button type="submit" className="button-primary" disabled={saving || Boolean(cnpjError)}>{saving ? "Salvando…" : "Salvar empresa"}</button></div>
    </form></div>}
  </>;
}
