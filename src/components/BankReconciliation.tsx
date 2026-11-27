import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, ClipboardCheck, RefreshCw, AlertTriangle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { listFinancialAccounts, listTransactions, requireUserId, requireWorkspaceId, type FinancialAccount, type Transaction } from "../lib/finance-data";

type Reconciliation = { id:string; account_id:string; period_start:string; period_end:string; statement_balance:number; calculated_balance:number; difference:number; status:string; created_at:string };
const money=(value:number)=>Number(value||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const today=()=>new Date().toISOString().slice(0,10);

export function BankReconciliation({showNotice}:{showNotice:(message:string)=>void}) {
 const [accounts,setAccounts]=useState<FinancialAccount[]>([]);
 const [transactions,setTransactions]=useState<Transaction[]>([]);
 const [reconciliations,setReconciliations]=useState<Reconciliation[]>([]);
 const [reconciledIds,setReconciledIds]=useState<string[]>([]);
 const [workspaceId,setWorkspaceId]=useState("");
 const [userId,setUserId]=useState("");
 const [accountId,setAccountId]=useState("");
 const [periodStart,setPeriodStart]=useState(new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().slice(0,10));
 const [periodEnd,setPeriodEnd]=useState(today());
 const [statementBalance,setStatementBalance]=useState("");
 const [selectedIds,setSelectedIds]=useState<string[]>([]);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const reload=useCallback(async()=>{
  setLoading(true);
  try{
   const [uid,wid,accountRows,transactionRows]=await Promise.all([requireUserId(),requireWorkspaceId(),listFinancialAccounts(),listTransactions()]);
   setUserId(uid);setWorkspaceId(wid);setAccounts(accountRows);setTransactions(transactionRows);
   if(!accountId&&accountRows.length)setAccountId(accountRows[0].id);
   const [r,i]=await Promise.all([
    (supabase as any).from("bank_reconciliations").select("*").eq("workspace_id",wid).order("period_end",{ascending:false}).limit(100),
    (supabase as any).from("bank_reconciliation_items").select("transaction_id").eq("workspace_id",wid)
   ]);
   if(r.error)throw r.error;if(i.error)throw i.error;
   setReconciliations((r.data??[]) as Reconciliation[]);
   setReconciledIds((i.data??[]).map((item:any)=>item.transaction_id));
  }catch(error){showNotice(error instanceof Error?error.message:"Não foi possível carregar a conciliação bancária.");}
  finally{setLoading(false);}
 },[showNotice,accountId]);
 useEffect(()=>{void reload();},[reload]);

 const account=accounts.find(item=>item.id===accountId);
 const eligible=useMemo(()=>transactions.filter(item=>item.account_id===accountId&&item.status==="paid"&&item.transaction_date>=periodStart&&item.transaction_date<=periodEnd&&!reconciledIds.includes(item.id)),[transactions,accountId,periodStart,periodEnd,reconciledIds]);
 const calculatedBalance=account?Number(account.opening_balance)+transactions.filter(item=>item.account_id===account.id&&item.status==="paid"&&(!account.opening_date||item.transaction_date>=account.opening_date)&&item.transaction_date<=periodEnd).reduce((sum,item)=>sum+(item.type==="income"?1:-1)*Number(item.amount),0):0;
 const statementValue=Number(statementBalance);
 const difference=statementBalance.trim()?statementValue-calculatedBalance:0;
 const toggle=(id:string)=>setSelectedIds(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id]);

 const createReconciliation=async(event:FormEvent)=>{
  event.preventDefault();
  if(!account||!statementBalance.trim()||!Number.isFinite(statementValue)){showNotice("Selecione uma conta e informe o saldo final do extrato.");return;}
  if(periodEnd<periodStart){showNotice("A data final deve ser igual ou posterior à data inicial.");return;}
  setSaving(true);
  try{
   const {data,error}=await (supabase as any).from("bank_reconciliations").insert({
    workspace_id:workspaceId,account_id:account.id,company_id:account.company_id,user_id:userId,
    period_start:periodStart,period_end:periodEnd,statement_balance:statementValue,
    calculated_balance:calculatedBalance,difference,notes:selectedIds.length+" movimentações marcadas como conferidas."
   }).select("*").single();
   if(error)throw error;
   if(selectedIds.length){
    const {error:itemError}=await (supabase as any).from("bank_reconciliation_items").insert(selectedIds.map(transaction_id=>({reconciliation_id:data.id,workspace_id:workspaceId,transaction_id,user_id:userId,match_status:"matched"})));
    if(itemError)throw itemError;
   }
   if(Math.abs(difference)<0.01){
    const {error:updateError}=await (supabase as any).from("bank_reconciliations").update({status:"reconciled",reconciled_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",data.id);
    if(updateError)throw updateError;
    showNotice("Conciliação concluída: o saldo do extrato confere com o saldo calculado.");
   }else{
    showNotice("Conciliação salva como rascunho. Confira a diferença antes de concluir.");
   }
   setSelectedIds([]);setStatementBalance("");await reload();
  }catch(error){showNotice(error instanceof Error?error.message:"Não foi possível salvar a conciliação.");}
  finally{setSaving(false);}
 };

 if(loading)return <section className="panel"><p>Carregando contas e movimentações…</p></section>;
 return <section className="advanced-management">
  <header className="personal-heading"><div><span className="eyebrow">FINANCEIRO · CONFERÊNCIA</span><h1>Conciliação bancária</h1><p>Compare o saldo do extrato com os lançamentos efetivados no NEXUS FINANCE.</p></div><button className="button-secondary" onClick={()=>void reload()}><RefreshCw size={15}/> Atualizar</button></header>
  <div className="panel advanced-panel">
   <div className="panel-heading"><div><h2>Nova conciliação</h2><p>Os dados são calculados a partir da conta e das transações reais cadastradas.</p></div></div>
   {!accounts.length?<p>Cadastre uma conta bancária antes de iniciar a conciliação.</p>:<form className="settings-form advanced-form" onSubmit={createReconciliation}>
    <label>Conta bancária<select required value={accountId} onChange={event=>{setAccountId(event.target.value);setSelectedIds([]);}}>{accounts.map(item=><option key={item.id} value={item.id}>{item.name} · {item.institution||"Banco não informado"}</option>)}</select></label>
    <label>Início do período<input required type="date" value={periodStart} onChange={event=>setPeriodStart(event.target.value)}/></label>
    <label>Fim do período<input required type="date" value={periodEnd} onChange={event=>setPeriodEnd(event.target.value)}/></label>
    <label>Saldo final do extrato (R$)<input required type="number" step="0.01" value={statementBalance} onChange={event=>setStatementBalance(event.target.value)} placeholder="0,00"/></label>
    <div className="reconciliation-summary"><div><span>Saldo calculado no sistema</span><strong>{money(calculatedBalance)}</strong></div><div><span>Diferença para o extrato</span><strong className={Math.abs(difference)<0.01?"positive":"negative"}>{money(difference)}</strong></div></div>
    <div className="reconciliation-candidates"><h3>Movimentações do período</h3><p>Marque as linhas que você conferiu no extrato. Itens já conciliados não aparecem novamente.</p>
     {eligible.length?eligible.map(item=><label className="reconciliation-row" key={item.id}><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={()=>toggle(item.id)}/><span><strong>{item.description}</strong><small>{item.transaction_date} · {item.counterparty||"Sem contraparte"} · {item.status}</small></span><b className={item.type==="income"?"positive":"negative"}>{item.type==="income"?"+":"−"} {money(Number(item.amount))}</b></label>):<p>Nenhuma movimentação ainda não conciliada neste período.</p>}
    </div>
    <div className="form-actions"><span>{selectedIds.length} movimentações marcadas</span><button className="button-primary" disabled={saving}>{Math.abs(difference)<0.01?"Concluir conciliação":"Salvar como rascunho"}</button></div>
   </form>}
  </div>
  <div className="panel advanced-panel"><div className="panel-heading"><div><h2>Histórico de conciliações</h2><p>Consulte os períodos já conferidos e as diferenças encontradas.</p></div></div>
   <div className="table-scroll"><table className="data-table"><thead><tr><th>Conta</th><th>Período</th><th>Saldo do extrato</th><th>Saldo calculado</th><th>Diferença</th><th>Status</th></tr></thead><tbody>{reconciliations.map(row=><tr key={row.id}><td>{accounts.find(item=>item.id===row.account_id)?.name||"Conta"}</td><td>{row.period_start} a {row.period_end}</td><td>{money(Number(row.statement_balance))}</td><td>{money(Number(row.calculated_balance))}</td><td>{money(Number(row.difference))}</td><td>{row.status==="reconciled"?<span className="positive"><CheckCircle2 size={14}/> Conciliado</span>:<span className="negative"><AlertTriangle size={14}/> Rascunho</span>}</td></tr>)}{!reconciliations.length&&<tr><td colSpan={6}>Nenhuma conciliação registrada.</td></tr>}</tbody></table></div>
  </div>
  <div className="demo-disclaimer"><ClipboardCheck size={14}/> A conciliação não movimenta dinheiro nem altera os lançamentos originais. Ela registra a conferência e sinaliza diferenças para revisão.</div>
 </section>;
}
