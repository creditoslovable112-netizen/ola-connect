import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, RefreshCw, Package, FileText, Users, ClipboardCheck, Wallet, ArrowDown, ArrowUp, Check, X, Clock3 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { requireUserId, requireWorkspaceId, listCompanies, type Company } from "../lib/finance-data";

type Notice = (message: string) => void;
type Mode = "business" | "personal";
type ModuleKey = "inventory" | "contracts" | "people" | "approvals" | "assets";
const money = (value: number) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const today = () => new Date().toISOString().slice(0, 10);

type InventoryItem = { id: string; name: string; sku: string | null; unit: string; stock_quantity: number; minimum_quantity: number; unit_cost: number; unit_price: number; company_id: string | null };
type Contract = { id: string; title: string; contract_number: string | null; counterparty: string; contract_type: string; start_date: string | null; end_date: string | null; contract_amount: number | null; status: string; company_id: string | null };
type Employee = { id: string; full_name: string; job_title: string | null; department: string | null; email: string | null; admission_date: string | null; status: string; company_id: string };
type Expense = { id: string; description: string; expense_type: string; amount: number; due_date: string | null; status: string; company_id: string; employee_id: string | null };
type Approval = { id: string; transaction_id: string; requested_by: string; status: string; request_note: string | null; requested_at: string; decision_note: string | null };
type Asset = { id: string; name: string; asset_type: string; institution: string | null; estimated_value: number; acquired_on: string | null; notes: string | null };

const statusName: Record<string, string> = { active: "Ativo", draft: "Rascunho", expired: "Vencido", terminated: "Encerrado", pending: "Pendente", approved: "Aprovado", rejected: "Rejeitado", cancelled: "Cancelado", leave: "Afastado", paid: "Pago" };

export function AdvancedManagement({ mode, module, showNotice }: { mode: Mode; module: ModuleKey; showNotice: Notice }) {
  const [workspaceId, setWorkspaceId] = useState("");
  const [userId, setUserId] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null);
  const [decision, setDecision] = useState<Approval | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [forms, setForms] = useState({
    itemName: "", sku: "", unit: "un", minimum: "0", cost: "0", price: "0",
    movementType: "in", movementQuantity: "", movementCost: "", movementNote: "",
    contractTitle: "", contractNumber: "", counterparty: "", contractType: "service", startDate: today(), endDate: "", contractAmount: "", contractNotes: "",
    employeeName: "", jobTitle: "", department: "", employeeEmail: "", employeePhone: "", admissionDate: today(),
    expenseDescription: "", expenseType: "salary", expenseAmount: "", expenseDue: today(), expenseEmployee: "",
    assetName: "", assetType: "other", institution: "", assetValue: "", acquiredOn: "", assetNotes: ""
  });

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [uid, wid, companyRows] = await Promise.all([requireUserId(), requireWorkspaceId(), listCompanies()]);
      setUserId(uid); setWorkspaceId(wid); setCompanies(companyRows);
      const savedCompany = typeof window !== "undefined" ? window.localStorage.getItem("nexus-active-company") : null;
      const activeCompany = savedCompany && savedCompany !== "all" ? savedCompany : (companyRows.length === 1 ? companyRows[0].id : "");
      setCompanyId(activeCompany);
      if (mode === "personal") {
        const { data, error } = await (supabase as any).from("personal_assets").select("*").eq("user_id", uid).order("created_at", { ascending: false });
        if (error) throw error;
        setAssets((data ?? []) as Asset[]);
      } else {
        const [i, m, c, e, pe, a, t] = await Promise.all([
          (supabase as any).from("inventory_items").select("*").eq("workspace_id", wid).order("name"),
          (supabase as any).from("inventory_movements").select("id,item_id,movement_type,quantity_delta,movement_date,reference,notes").eq("workspace_id", wid).order("created_at", { ascending: false }).limit(100),
          (supabase as any).from("business_contracts").select("*").eq("workspace_id", wid).order("end_date", { ascending: true, nullsFirst: false }),
          (supabase as any).from("company_employees").select("*").eq("workspace_id", wid).order("full_name"),
          (supabase as any).from("personnel_expenses").select("*").eq("workspace_id", wid).order("due_date", { ascending: true, nullsFirst: false }),
          (supabase as any).from("transaction_approvals").select("*").eq("workspace_id", wid).order("requested_at", { ascending: false }),
          (supabase as any).from("transactions").select("id,description,amount,due_date,type,status,company_id").eq("workspace_id", wid).eq("status", "pending").order("due_date", { ascending: true }).limit(100)
        ]);
        for (const result of [i,m,c,e,pe,a,t]) if (result.error) throw result.error;
        setItems((i.data ?? []) as InventoryItem[]); setMovements(m.data ?? []);
        setContracts((c.data ?? []) as Contract[]); setEmployees((e.data ?? []) as Employee[]);
        setExpenses((pe.data ?? []) as Expense[]); setApprovals((a.data ?? []) as Approval[]);
        setPendingTransactions(t.data ?? []);
      }
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Não foi possível carregar este módulo.");
    } finally { setLoading(false); }
  }, [mode, showNotice]);

  useEffect(() => { void reload(); }, [reload]);

  const scopedItems = useMemo(() => companyId ? items.filter(item => item.company_id === companyId) : items, [items, companyId]);
  const scopedContracts = useMemo(() => companyId ? contracts.filter(item => item.company_id === companyId) : contracts, [contracts, companyId]);
  const scopedEmployees = useMemo(() => companyId ? employees.filter(item => item.company_id === companyId) : employees, [employees, companyId]);
  const scopedExpenses = useMemo(() => companyId ? expenses.filter(item => item.company_id === companyId) : expenses, [expenses, companyId]);
  const selectedCompany = companies.find(company => company.id === companyId);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!userId || !workspaceId) { showNotice("Não foi possível validar seu workspace. Atualize a tela."); return; }
    setBusy(true);
    try {
      if (module === "inventory") {
        if (!companyId) throw new Error("Selecione uma empresa antes de cadastrar o produto.");
        const { error } = await (supabase as any).from("inventory_items").insert({
          workspace_id: workspaceId, company_id: companyId, user_id: userId,
          name: forms.itemName.trim(), sku: forms.sku.trim() || null, unit: forms.unit,
          minimum_quantity: Number(forms.minimum || 0), unit_cost: Number(forms.cost || 0), unit_price: Number(forms.price || 0)
        });
        if (error) throw error;
        showNotice("Produto cadastrado no estoque.");
      } else if (module === "contracts") {
        if (!companyId) throw new Error("Selecione uma empresa antes de cadastrar o contrato.");
        const { error } = await (supabase as any).from("business_contracts").insert({
          workspace_id: workspaceId, company_id: companyId, user_id: userId,
          title: forms.contractTitle.trim(), contract_number: forms.contractNumber.trim() || null,
          counterparty: forms.counterparty.trim(), contract_type: forms.contractType,
          start_date: forms.startDate || null, end_date: forms.endDate || null,
          contract_amount: forms.contractAmount ? Number(forms.contractAmount) : null,
          notes: forms.contractNotes.trim() || null
        });
        if (error) throw error;
        showNotice("Contrato cadastrado.");
      } else if (module === "people") {
        if (!companyId) throw new Error("Selecione uma empresa antes de cadastrar o funcionário.");
        const { error } = await (supabase as any).from("company_employees").insert({
          workspace_id: workspaceId, company_id: companyId, user_id: userId,
          full_name: forms.employeeName.trim(), job_title: forms.jobTitle.trim() || null,
          department: forms.department.trim() || null, email: forms.employeeEmail.trim() || null,
          phone: forms.employeePhone.trim() || null, admission_date: forms.admissionDate || null
        });
        if (error) throw error;
        showNotice("Funcionário cadastrado. O acesso a esses dados é restrito a administradores.");
      } else if (module === "assets") {
        const { error } = await (supabase as any).from("personal_assets").insert({
          user_id: userId, name: forms.assetName.trim(), asset_type: forms.assetType,
          institution: forms.institution.trim() || null, estimated_value: Number(forms.assetValue),
          acquired_on: forms.acquiredOn || null, notes: forms.assetNotes.trim() || null
        });
        if (error) throw error;
        showNotice("Bem adicionado ao seu patrimônio.");
      }
      setShowForm(false);
      setForms(current => ({ ...current, itemName: "", sku: "", contractTitle: "", contractNumber: "", counterparty: "", contractAmount: "", contractNotes: "", employeeName: "", jobTitle: "", department: "", employeeEmail: "", employeePhone: "", assetName: "", institution: "", assetValue: "", assetNotes: "" }));
      await reload();
    } catch (error) { showNotice(error instanceof Error ? error.message : "Não foi possível salvar o registro."); }
    finally { setBusy(false); }
  };

  const addMovement = async (event: FormEvent) => {
    event.preventDefault();
    if (!movementItem || !companyId) return;
    const amount = Number(forms.movementQuantity);
    if (!(amount > 0)) { showNotice("Informe uma quantidade maior que zero."); return; }
    const signed = forms.movementType === "out" ? -amount : forms.movementType === "adjustment" ? amount : amount;
    setBusy(true);
    const { error } = await (supabase as any).from("inventory_movements").insert({
      workspace_id: workspaceId, company_id: movementItem.company_id, item_id: movementItem.id,
      user_id: userId, movement_type: forms.movementType, quantity_delta: signed,
      unit_cost: forms.movementCost ? Number(forms.movementCost) : null, notes: forms.movementNote.trim() || null
    });
    setBusy(false);
    if (error) { showNotice(error.message); return; }
    setMovementItem(null); setForms(current => ({ ...current, movementQuantity: "", movementCost: "", movementNote: "" }));
    showNotice("Movimentação registrada e estoque atualizado."); await reload();
  };

  const addPersonnelExpense = async (event: FormEvent) => {
    event.preventDefault();
    if (!companyId || !(Number(forms.expenseAmount) > 0)) { showNotice("Selecione a empresa e informe um valor válido."); return; }
    setBusy(true);
    const { error } = await (supabase as any).from("personnel_expenses").insert({
      workspace_id: workspaceId, company_id: companyId, user_id: userId,
      employee_id: forms.expenseEmployee || null, description: forms.expenseDescription.trim(),
      expense_type: forms.expenseType, amount: Number(forms.expenseAmount), due_date: forms.expenseDue || null
    });
    setBusy(false);
    if (error) showNotice(error.message); else { showNotice("Despesa com pessoal registrada."); setForms(current => ({ ...current, expenseDescription: "", expenseAmount: "", expenseEmployee: "" })); await reload(); }
  };

  const requestApproval = async (transaction: any) => {
    setBusy(true);
    const { error } = await (supabase as any).from("transaction_approvals").insert({
      workspace_id: workspaceId, transaction_id: transaction.id, requested_by: userId,
      request_note: "Solicitação de aprovação registrada pelo módulo financeiro."
    });
    setBusy(false);
    if (error) showNotice(error.code === "23505" ? "Esta movimentação já possui uma solicitação de aprovação." : error.message);
    else { showNotice("Solicitação enviada para aprovação do administrador."); await reload(); }
  };

  const decideApproval = async (status: "approved" | "rejected") => {
    if (!decision) return;
    setBusy(true);
    const { error } = await (supabase as any).from("transaction_approvals").update({
      status, decided_by: userId, decided_at: new Date().toISOString(), decision_note: decisionNote.trim() || null
    }).eq("id", decision.id).eq("status", "pending");
    setBusy(false);
    if (error) showNotice(error.message); else { showNotice(status === "approved" ? "Pagamento aprovado." : "Solicitação rejeitada."); setDecision(null); setDecisionNote(""); await reload(); }
  };

  const removeAsset = async (asset: Asset) => {
    if (!window.confirm("Remover este bem do seu patrimônio?")) return;
    const { error } = await (supabase as any).from("personal_assets").delete().eq("id", asset.id).eq("user_id", userId);
    if (error) showNotice(error.message); else { showNotice("Bem removido do patrimônio."); await reload(); }
  };

  const title = module === "inventory" ? "Gestão de estoque" : module === "contracts" ? "Gestão de contratos" : module === "people" ? "Gestão de pessoas" : module === "approvals" ? "Aprovação de pagamentos" : "Patrimônio pessoal";
  const subtitle = module === "inventory" ? "Acompanhe produtos, quantidades, entradas e saídas." : module === "contracts" ? "Organize contratos, valores, prazos e situação." : module === "people" ? "Cadastre colaboradores e acompanhe despesas com pessoal." : module === "approvals" ? "Controle solicitações e decisões de aprovação financeira." : "Registre seus bens e acompanhe o valor estimado do patrimônio.";
  const totalAssets = assets.reduce((sum, item) => sum + Number(item.estimated_value), 0);

  if (loading) return <section className="panel"><p>Carregando dados reais do NEXUS FINANCE…</p></section>;

  return <section className="advanced-management">
    <header className="personal-heading">
      <div><span className="eyebrow">{mode === "personal" ? "AMBIENTE PESSOAL PRIVADO" : "GESTÃO EMPRESARIAL"}</span><h1>{title}</h1><p>{subtitle}</p></div>
      <button className="button-secondary" onClick={() => void reload()}><RefreshCw size={15}/> Atualizar</button>
    </header>
    {mode === "business" && <div className="panel advanced-filter"><label>Empresa<select value={companyId} onChange={event => setCompanyId(event.target.value)}><option value="">Todas as empresas</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label><small>{selectedCompany ? selectedCompany.name : "Visão consolidada do workspace"}</small></div>}

    {module === "inventory" && <>
      <div className="personal-metrics"><article><Package/><span>Produtos cadastrados</span><strong>{scopedItems.length}</strong></article><article><Wallet/><span>Valor estimado em estoque</span><strong>{money(scopedItems.reduce((sum,item)=>sum+Number(item.stock_quantity)*Number(item.unit_cost),0))}</strong></article><article><Clock3/><span>Estoque abaixo do mínimo</span><strong>{scopedItems.filter(item=>Number(item.stock_quantity)<=Number(item.minimum_quantity)).length}</strong></article></div>
      <div className="panel advanced-panel"><div className="panel-heading"><div><h2>Produtos</h2><p>Os saldos são atualizados pelas movimentações registradas.</p></div><button className="button-primary" onClick={()=>setShowForm(true)}><Plus size={15}/> Novo produto</button></div>
        {showForm && <form className="settings-form advanced-form" onSubmit={save}><label>Nome do produto<input required minLength={2} value={forms.itemName} onChange={e=>setForms({...forms,itemName:e.target.value})}/></label><label>SKU / Código<input value={forms.sku} onChange={e=>setForms({...forms,sku:e.target.value})}/></label><label>Unidade<input value={forms.unit} onChange={e=>setForms({...forms,unit:e.target.value})}/></label><label>Estoque mínimo<input type="number" min="0" step="0.001" value={forms.minimum} onChange={e=>setForms({...forms,minimum:e.target.value})}/></label><label>Custo unitário<input type="number" min="0" step="0.01" value={forms.cost} onChange={e=>setForms({...forms,cost:e.target.value})}/></label><label>Preço de venda<input type="number" min="0" step="0.01" value={forms.price} onChange={e=>setForms({...forms,price:e.target.value})}/></label><div className="form-actions"><button type="button" className="button-secondary" onClick={()=>setShowForm(false)}>Cancelar</button><button className="button-primary" disabled={busy}>Salvar produto</button></div></form>}
        <div className="table-scroll"><table className="data-table"><thead><tr><th>Produto</th><th>SKU</th><th>Estoque</th><th>Mínimo</th><th>Custo</th><th>Valor</th><th></th></tr></thead><tbody>{scopedItems.map(item=><tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.sku||"—"}</td><td>{Number(item.stock_quantity).toLocaleString("pt-BR")} {item.unit}</td><td>{Number(item.minimum_quantity).toLocaleString("pt-BR")}</td><td>{money(Number(item.unit_cost))}</td><td>{money(Number(item.stock_quantity)*Number(item.unit_cost))}</td><td><button className="button-secondary" onClick={()=>setMovementItem(item)}>Movimentar</button></td></tr>)}{!scopedItems.length&&<tr><td colSpan={7}>Nenhum produto cadastrado nesta empresa.</td></tr>}</tbody></table></div>
      </div>
      <div className="panel advanced-panel"><div className="panel-heading"><h2>Movimentações recentes</h2><span>{movements.length} registros</span></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Data</th><th>Tipo</th><th>Produto</th><th>Quantidade</th><th>Referência</th></tr></thead><tbody>{movements.filter(m=>!companyId||items.some(i=>i.id===m.item_id&&i.company_id===companyId)).slice(0,20).map(m=><tr key={m.id}><td>{m.movement_date}</td><td>{m.movement_type==="in"?"Entrada":m.movement_type==="out"?"Saída":"Ajuste"}</td><td>{items.find(i=>i.id===m.item_id)?.name||"Produto"}</td><td>{Number(m.quantity_delta).toLocaleString("pt-BR")}</td><td>{m.reference||m.notes||"—"}</td></tr>)}{!movements.length&&<tr><td colSpan={5}>Nenhuma movimentação registrada.</td></tr>}</tbody></table></div></div>
      {movementItem&&<div className="modal-backdrop"><form className="payable-modal" onSubmit={addMovement}><div className="modal-heading"><div><h2>Movimentar estoque</h2><p>{movementItem.name} · saldo atual {movementItem.stock_quantity}</p></div><button type="button" className="icon-button" onClick={()=>setMovementItem(null)}>×</button></div><label>Tipo<select value={forms.movementType} onChange={e=>setForms({...forms,movementType:e.target.value})}><option value="in">Entrada</option><option value="out">Saída</option><option value="adjustment">Ajuste positivo</option></select></label><label>Quantidade<input required type="number" min="0.001" step="0.001" value={forms.movementQuantity} onChange={e=>setForms({...forms,movementQuantity:e.target.value})}/></label><label>Custo unitário (opcional)<input type="number" min="0" step="0.01" value={forms.movementCost} onChange={e=>setForms({...forms,movementCost:e.target.value})}/></label><label>Observação<input value={forms.movementNote} onChange={e=>setForms({...forms,movementNote:e.target.value})}/></label><button className="button-primary" disabled={busy}>Registrar movimentação</button></form></div>}
    </>}

    {module === "contracts" && <div className="panel advanced-panel"><div className="panel-heading"><div><h2>Contratos</h2><p>Controle prazos, valores e partes contratantes.</p></div><button className="button-primary" onClick={()=>setShowForm(true)}><Plus size={15}/> Novo contrato</button></div>
      {showForm&&<form className="settings-form advanced-form" onSubmit={save}><label>Título<input required value={forms.contractTitle} onChange={e=>setForms({...forms,contractTitle:e.target.value})}/></label><label>Número do contrato<input value={forms.contractNumber} onChange={e=>setForms({...forms,contractNumber:e.target.value})}/></label><label>Contraparte<input required value={forms.counterparty} onChange={e=>setForms({...forms,counterparty:e.target.value})}/></label><label>Tipo<select value={forms.contractType} onChange={e=>setForms({...forms,contractType:e.target.value})}><option value="service">Serviço</option><option value="supply">Fornecimento</option><option value="lease">Locação</option><option value="employment">Trabalho</option><option value="other">Outro</option></select></label><label>Início<input type="date" value={forms.startDate} onChange={e=>setForms({...forms,startDate:e.target.value})}/></label><label>Vencimento<input type="date" value={forms.endDate} onChange={e=>setForms({...forms,endDate:e.target.value})}/></label><label>Valor total<input type="number" min="0" step="0.01" value={forms.contractAmount} onChange={e=>setForms({...forms,contractAmount:e.target.value})}/></label><label>Observações<textarea value={forms.contractNotes} onChange={e=>setForms({...forms,contractNotes:e.target.value})}/></label><div className="form-actions"><button type="button" className="button-secondary" onClick={()=>setShowForm(false)}>Cancelar</button><button className="button-primary" disabled={busy}>Salvar contrato</button></div></form>}
      <div className="table-scroll"><table className="data-table"><thead><tr><th>Contrato</th><th>Contraparte</th><th>Prazo</th><th>Valor</th><th>Status</th></tr></thead><tbody>{scopedContracts.map(c=><tr key={c.id}><td><strong>{c.title}</strong><small>{c.contract_number||"Sem número"}</small></td><td>{c.counterparty}</td><td>{c.end_date||"Sem prazo"}</td><td>{c.contract_amount==null?"—":money(Number(c.contract_amount))}</td><td>{statusName[c.status]||c.status}</td></tr>)}{!scopedContracts.length&&<tr><td colSpan={5}>Nenhum contrato cadastrado.</td></tr>}</tbody></table></div>
    </div>}

    {module === "people" && <><div className="panel advanced-panel"><div className="panel-heading"><div><h2>Colaboradores</h2><p>Cadastro restrito a proprietários e administradores.</p></div><button className="button-primary" onClick={()=>setShowForm(true)}><Plus size={15}/> Novo funcionário</button></div>
      {showForm&&<form className="settings-form advanced-form" onSubmit={save}><label>Nome completo<input required value={forms.employeeName} onChange={e=>setForms({...forms,employeeName:e.target.value})}/></label><label>Cargo<input value={forms.jobTitle} onChange={e=>setForms({...forms,jobTitle:e.target.value})}/></label><label>Departamento<input value={forms.department} onChange={e=>setForms({...forms,department:e.target.value})}/></label><label>E-mail<input type="email" value={forms.employeeEmail} onChange={e=>setForms({...forms,employeeEmail:e.target.value})}/></label><label>Telefone<input value={forms.employeePhone} onChange={e=>setForms({...forms,employeePhone:e.target.value})}/></label><label>Admissão<input type="date" value={forms.admissionDate} onChange={e=>setForms({...forms,admissionDate:e.target.value})}/></label><div className="form-actions"><button type="button" className="button-secondary" onClick={()=>setShowForm(false)}>Cancelar</button><button className="button-primary" disabled={busy}>Salvar funcionário</button></div></form>}
      <div className="table-scroll"><table className="data-table"><thead><tr><th>Funcionário</th><th>Cargo</th><th>Departamento</th><th>Admissão</th><th>Status</th></tr></thead><tbody>{scopedEmployees.map(e=><tr key={e.id}><td><strong>{e.full_name}</strong><small>{e.email||"—"}</small></td><td>{e.job_title||"—"}</td><td>{e.department||"—"}</td><td>{e.admission_date||"—"}</td><td>{statusName[e.status]||e.status}</td></tr>)}{!scopedEmployees.length&&<tr><td colSpan={5}>Nenhum funcionário cadastrado.</td></tr>}</tbody></table></div>
    </div>
    <div className="panel advanced-panel"><div className="panel-heading"><div><h2>Despesas com pessoal</h2><p>Registre salários, benefícios, tributos, bônus e reembolsos.</p></div></div><form className="settings-form advanced-form" onSubmit={addPersonnelExpense}><label>Descrição<input required value={forms.expenseDescription} onChange={e=>setForms({...forms,expenseDescription:e.target.value})}/></label><label>Tipo<select value={forms.expenseType} onChange={e=>setForms({...forms,expenseType:e.target.value})}><option value="salary">Salário</option><option value="benefit">Benefício</option><option value="tax">Encargos / tributos</option><option value="bonus">Bônus</option><option value="reimbursement">Reembolso</option><option value="other">Outro</option></select></label><label>Funcionário<select value={forms.expenseEmployee} onChange={e=>setForms({...forms,expenseEmployee:e.target.value})}><option value="">Não vincular</option>{scopedEmployees.map(e=><option key={e.id} value={e.id}>{e.full_name}</option>)}</select></label><label>Valor<input required type="number" min="0.01" step="0.01" value={forms.expenseAmount} onChange={e=>setForms({...forms,expenseAmount:e.target.value})}/></label><label>Vencimento<input type="date" value={forms.expenseDue} onChange={e=>setForms({...forms,expenseDue:e.target.value})}/></label><button className="button-primary" disabled={busy}>Registrar despesa</button></form><div className="table-scroll"><table className="data-table"><thead><tr><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Vencimento</th><th>Status</th></tr></thead><tbody>{scopedExpenses.map(e=><tr key={e.id}><td>{e.description}</td><td>{e.expense_type}</td><td>{money(Number(e.amount))}</td><td>{e.due_date||"—"}</td><td>{statusName[e.status]||e.status}</td></tr>)}{!scopedExpenses.length&&<tr><td colSpan={5}>Nenhuma despesa registrada.</td></tr>}</tbody></table></div></div></>}

    {module === "approvals" && <><div className="panel advanced-panel"><div className="panel-heading"><div><h2>Contas aguardando aprovação</h2><p>Solicite aprovação para movimentações pendentes.</p></div></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Vencimento</th><th></th></tr></thead><tbody>{pendingTransactions.filter(t=>!companyId||t.company_id===companyId).filter(t=>!approvals.some(a=>a.transaction_id===t.id)).map(t=><tr key={t.id}><td>{t.description}</td><td>{t.type==="expense"?"Despesa":"Receita"}</td><td>{money(Number(t.amount))}</td><td>{t.due_date||"—"}</td><td><button className="button-secondary" onClick={()=>void requestApproval(t)} disabled={busy}>Solicitar aprovação</button></td></tr>)}{!pendingTransactions.filter(t=>!companyId||t.company_id===companyId).filter(t=>!approvals.some(a=>a.transaction_id===t.id)).length&&<tr><td colSpan={5}>Não há movimentações pendentes sem solicitação.</td></tr>}</tbody></table></div></div>
      <div className="panel advanced-panel"><div className="panel-heading"><h2>Solicitações de aprovação</h2></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Movimentação</th><th>Solicitada em</th><th>Status</th><th>Decisão</th></tr></thead><tbody>{approvals.filter(a=>!companyId||pendingTransactions.some(t=>t.id===a.transaction_id&&t.company_id===companyId)||true).map(a=><tr key={a.id}><td>{pendingTransactions.find(t=>t.id===a.transaction_id)?.description||"Movimentação financeira"}</td><td>{new Date(a.requested_at).toLocaleDateString("pt-BR")}</td><td>{statusName[a.status]||a.status}</td><td>{a.status==="pending"?<button className="button-secondary" onClick={()=>setDecision(a)}>Analisar</button>:a.decision_note||"—"}</td></tr>)}{!approvals.length&&<tr><td colSpan={4}>Nenhuma solicitação registrada.</td></tr>}</tbody></table></div></div>
      {decision&&<div className="modal-backdrop"><section className="payable-modal"><div className="modal-heading"><div><h2>Analisar solicitação</h2><p>Somente administradores podem decidir.</p></div><button className="icon-button" onClick={()=>setDecision(null)}>×</button></div><label>Observação da decisão<textarea value={decisionNote} onChange={e=>setDecisionNote(e.target.value)}/></label><div className="form-actions"><button className="button-secondary" onClick={()=>void decideApproval("rejected")} disabled={busy}><X size={15}/> Rejeitar</button><button className="button-primary" onClick={()=>void decideApproval("approved")} disabled={busy}><Check size={15}/> Aprovar</button></div></section></div>}
    </>}

    {module === "assets" && <><div className="personal-metrics"><article><Wallet/><span>Patrimônio declarado</span><strong>{money(totalAssets)}</strong></article><article><Package/><span>Quantidade de bens</span><strong>{assets.length}</strong></article></div><div className="panel advanced-panel"><div className="panel-heading"><div><h2>Meus bens</h2><p>Valores informados por você; não são cotações automáticas.</p></div><button className="button-primary" onClick={()=>setShowForm(true)}><Plus size={15}/> Adicionar bem</button></div>{showForm&&<form className="settings-form advanced-form" onSubmit={save}><label>Descrição do bem<input required value={forms.assetName} onChange={e=>setForms({...forms,assetName:e.target.value})}/></label><label>Categoria<select value={forms.assetType} onChange={e=>setForms({...forms,assetType:e.target.value})}><option value="real_estate">Imóvel</option><option value="vehicle">Veículo</option><option value="investment">Investimento</option><option value="cash">Dinheiro / reserva</option><option value="business">Participação em empresa</option><option value="other">Outro</option></select></label><label>Instituição / local<input value={forms.institution} onChange={e=>setForms({...forms,institution:e.target.value})}/></label><label>Valor estimado<input required type="number" min="0" step="0.01" value={forms.assetValue} onChange={e=>setForms({...forms,assetValue:e.target.value})}/></label><label>Data de aquisição<input type="date" value={forms.acquiredOn} onChange={e=>setForms({...forms,acquiredOn:e.target.value})}/></label><label>Observações<textarea value={forms.assetNotes} onChange={e=>setForms({...forms,assetNotes:e.target.value})}/></label><div className="form-actions"><button type="button" className="button-secondary" onClick={()=>setShowForm(false)}>Cancelar</button><button className="button-primary" disabled={busy}>Salvar bem</button></div></form>}<div className="table-scroll"><table className="data-table"><thead><tr><th>Bem</th><th>Categoria</th><th>Instituição / local</th><th>Valor estimado</th><th></th></tr></thead><tbody>{assets.map(asset=><tr key={asset.id}><td><strong>{asset.name}</strong><small>{asset.acquired_on||"Data não informada"}</small></td><td>{asset.asset_type}</td><td>{asset.institution||"—"}</td><td>{money(Number(asset.estimated_value))}</td><td><button className="button-secondary" onClick={()=>void removeAsset(asset)}>Remover</button></td></tr>)}{!assets.length&&<tr><td colSpan={5}>Nenhum bem cadastrado. Adicione seus bens para acompanhar seu patrimônio.</td></tr>}</tbody></table></div></div></>}
  </section>;
}
