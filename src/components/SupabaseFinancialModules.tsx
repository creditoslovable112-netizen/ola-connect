import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Activity, ArrowDownLeft, ArrowUpRight, CalendarDays, Landmark, Plus, RefreshCw, ShieldCheck, Tags, Wallet } from "lucide-react";
import {
  createCategory, createCostCenter, createFinancialAccount, createTransaction,
  listCategories, listCostCenters, listFinancialAccounts, listTransactions,
  updateTransaction, type Category, type CostCenter, type FinancialAccount, type Transaction,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [a, c, cc, t] = await Promise.all([listFinancialAccounts(), listCategories(), listCostCenters(), listTransactions()]);
      setAccounts(a); setCategories(c); setCenters(cc); setTransactions(t);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Não foi possível carregar os dados.";
      setError(message); notice(message);
    } finally { setLoading(false); }
  }, [notice]);
  useEffect(() => { void reload(); }, [reload]);
  return { accounts, setAccounts, categories, setCategories, centers, setCenters, transactions, setTransactions, loading, error, reload };
}

function DataState({ loading, error, retry }: { loading: boolean; error: string; retry: () => void }) {
  if (loading) return <div className="panel"><p>Carregando dados do Supabase…</p></div>;
  if (error) return <div className="panel"><p role="alert">{error}</p><button className="button-secondary" onClick={retry}><RefreshCw size={15}/> Tentar novamente</button></div>;
  return null;
}

function TransactionForm({ type, accounts, categories, onClose, onSaved, notice }: {
  type: "income" | "expense"; accounts: FinancialAccount[]; categories: Category[];
  onClose: () => void; onSaved: () => Promise<void>; notice: Notice;
}) {
  const [description, setDescription] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState(today());
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const options = categories.filter((item) => item.type === type);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!accountId) { notice("Cadastre uma conta financeira antes de lançar movimentações."); return; }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) { notice("Informe um valor maior que zero."); return; }
    setSaving(true);
    try {
      await createTransaction({ account_id: accountId, category_id: categoryId || null, cost_center_id: null,
        type, description: description.trim(), counterparty: counterparty.trim() || null, amount: value,
        status: "pending", transaction_date: due, due_date: due, notes: null });
      await onSaved(); onClose(); notice(type === "expense" ? "Conta a pagar salva no Supabase." : "Conta a receber salva no Supabase.");
    } catch (e) { notice(e instanceof Error ? e.message : "Falha ao salvar movimentação."); }
    finally { setSaving(false); }
  };
  return <div className="modal-backdrop" onClick={onClose}><form className="payable-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
    <div className="modal-heading"><div><h2>{type === "expense" ? "Nova conta a pagar" : "Nova conta a receber"}</h2><p>O registro será salvo na sua conta do Supabase</p></div><button type="button" className="icon-button" onClick={onClose}>×</button></div>
    <label>Descrição<input required value={description} onChange={(e) => setDescription(e.target.value)} maxLength={160}/></label>
    <label>{type === "expense" ? "Fornecedor" : "Cliente"}<input value={counterparty} onChange={(e) => setCounterparty(e.target.value)} maxLength={120}/></label>
    <div className="modal-fields"><label>Valor (R$)<input required type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}/></label><label>Vencimento<input required type="date" value={due} onChange={(e) => setDue(e.target.value)}/></label></div>
    <label>Conta financeira<select required value={accountId} onChange={(e) => setAccountId(e.target.value)}>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Categoria<select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">Sem categoria</option>{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
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
    {modal && <TransactionForm type="expense" accounts={data.accounts} categories={data.categories} onClose={() => setModal(false)} onSaved={data.reload} notice={showNotice}/>}
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
    {modal && <TransactionForm type="income" accounts={data.accounts} categories={data.categories} onClose={() => setModal(false)} onSaved={data.reload} notice={showNotice}/>}
  </>;
}

export function SupabaseAccounts({ showNotice }: { showNotice: Notice }) {
  const data = useFinanceData(showNotice); const [modal, setModal] = useState(false);
  const [name, setName] = useState(""); const [institution, setInstitution] = useState(""); const [kind, setKind] = useState("checking"); const [balance, setBalance] = useState("0");
  const balances = (account: FinancialAccount) => Number(account.opening_balance) + data.transactions.filter((item) => item.account_id === account.id && item.status === "paid").reduce((sum, item) => sum + (item.type === "income" ? Number(item.amount) : -Number(item.amount)), 0);
  const save = async (event: FormEvent) => { event.preventDefault(); try { await createFinancialAccount({ name, institution: institution || null, account_type: kind, opening_balance: Number(balance), color: "#238bd2", is_active: true }); await data.reload(); setModal(false); setName(""); setInstitution(""); showNotice("Conta financeira salva no Supabase."); } catch (e) { showNotice(e instanceof Error ? e.message : "Falha ao salvar conta."); } };
  return <><div className="welcome-row"><div><div className="eyebrow">FINANCEIRO · SUPABASE</div><h1>Contas financeiras</h1><p>Contas e saldos calculados a partir dos lançamentos efetivados.</p></div><button className="button-primary" onClick={() => setModal(true)}><Plus size={16}/> Nova conta</button></div>
    <DataState loading={data.loading} error={data.error} retry={() => void data.reload()}/>
    {!data.loading && !data.error && <><section className="account-total-card"><div><span>Saldo consolidado</span><strong>{money(data.accounts.reduce((sum, item) => sum + balances(item), 0))}</strong><small>Soma dos saldos das contas ativas</small></div><Landmark size={28}/></section><section className="financial-account-grid">{data.accounts.map((item) => <article className="financial-account-card" key={item.id}><div className="financial-account-top"><span className="account-bank-icon"><Landmark size={19}/></span><span className="account-kind">{item.account_type}</span></div><div className="account-bank-name">{item.institution || "Instituição não informada"}</div><h3>{item.name}</h3><div className="account-balance-label">Saldo calculado</div><strong className="account-balance">{money(balances(item))}</strong></article>)}</section>{data.accounts.length === 0 && <div className="panel">Nenhuma conta cadastrada ainda.</div>}</>}
    {modal && <div className="modal-backdrop" onClick={() => setModal(false)}><form className="payable-modal" onClick={(e) => e.stopPropagation()} onSubmit={save}><div className="modal-heading"><h2>Nova conta financeira</h2><button type="button" onClick={() => setModal(false)}>×</button></div><label>Nome<input required value={name} onChange={(e) => setName(e.target.value)}/></label><label>Banco / instituição<input value={institution} onChange={(e) => setInstitution(e.target.value)}/></label><label>Tipo<select value={kind} onChange={(e) => setKind(e.target.value)}><option value="checking">Conta corrente</option><option value="savings">Poupança</option><option value="cash">Dinheiro em caixa</option><option value="credit_card">Cartão de crédito</option><option value="investment">Investimento</option><option value="other">Outra</option></select></label><label>Saldo inicial<input required type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)}/></label><div className="modal-actions"><button type="button" className="button-secondary" onClick={() => setModal(false)}>Cancelar</button><button className="button-primary" type="submit">Salvar conta</button></div></form></div>}
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
