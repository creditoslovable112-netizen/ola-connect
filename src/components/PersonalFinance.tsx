import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, RefreshCw, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { supabase } from "../lib/supabase";

type Account = { id:string; name:string; account_type:string; institution:string|null; opening_balance:number; is_active:boolean };
type Entry = { id:string; account_id:string|null; type:"income"|"expense"; description:string; category:string|null; amount:number; transaction_date:string; status:"pending"|"paid"|"cancelled" };
type Financing = { id:string; name:string; financing_type:string; lender:string|null; principal_amount:number; total_amount:number; monthly_installment:number; installments_total:number; installments_paid:number; monthly_interest_rate:number|null; first_due_date:string; is_active:boolean };
type Payment = { id:string; financing_id:string; installment_number:number; amount:number; paid_at:string };
type Tab = "overview"|"transactions"|"accounts"|"financings";
const money=(v:number)=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const today=()=>new Date().toISOString().slice(0,10);
const types:Record<string,string>={vehicle:"Veículo",real_estate:"Imóvel",personal_loan:"Empréstimo pessoal",other:"Outro"};
const accountTypes:Record<string,string>={checking:"Conta corrente",savings:"Poupança",cash:"Dinheiro",credit_card:"Cartão de crédito",investment:"Investimento",other:"Outra"};

export function PersonalFinance({showNotice}:{showNotice:(message:string)=>void}) {
 const [tab,setTab]=useState<Tab>("overview");
 const [accounts,setAccounts]=useState<Account[]>([]);
 const [entries,setEntries]=useState<Entry[]>([]);
 const [financings,setFinancings]=useState<Financing[]>([]);
 const [payments,setPayments]=useState<Payment[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [accountForm,setAccountForm]=useState({name:"",account_type:"checking",institution:"",opening_balance:"0"});
 const [entryForm,setEntryForm]=useState({type:"expense" as "income"|"expense",description:"",category:"",amount:"",transaction_date:today(),account_id:"",status:"paid" as "pending"|"paid"});
 const [financingForm,setFinancingForm]=useState({name:"",financing_type:"vehicle",lender:"",principal_amount:"",total_amount:"",monthly_installment:"",installments_total:"",monthly_interest_rate:"",first_due_date:today()});
 const [paymentTarget,setPaymentTarget]=useState<Financing|null>(null);
 const [paymentDate,setPaymentDate]=useState(today());
 const [paymentAmount,setPaymentAmount]=useState("");

 const reload=useCallback(async()=>{
  setLoading(true);
  try {
   const [a,e,f,p]=await Promise.all([
    supabase.from("personal_financial_accounts").select("id,name,account_type,institution,opening_balance,is_active").eq("is_active",true).order("name"),
    supabase.from("personal_transactions").select("id,account_id,type,description,category,amount,transaction_date,status").order("transaction_date",{ascending:false}).limit(500),
    supabase.from("personal_financings").select("id,name,financing_type,lender,principal_amount,total_amount,monthly_installment,installments_total,installments_paid,monthly_interest_rate,first_due_date,is_active").eq("is_active",true).order("first_due_date"),
    supabase.from("personal_financing_payments").select("id,financing_id,installment_number,amount,paid_at").order("paid_at",{ascending:false})
   ]);
   for(const r of [a,e,f,p]) if(r.error) throw r.error;
   setAccounts((a.data||[]) as Account[]); setEntries((e.data||[]) as Entry[]); setFinancings((f.data||[]) as Financing[]); setPayments((p.data||[]) as Payment[]);
  } catch(error) { showNotice(error instanceof Error?error.message:"Não foi possível carregar suas finanças pessoais."); }
  finally {setLoading(false);}
 },[showNotice]);
 useEffect(()=>{void reload();},[reload]);

 const paidEntries=entries.filter(x=>x.status==="paid");
 const income=paidEntries.filter(x=>x.type==="income").reduce((s,x)=>s+Number(x.amount),0);
 const expense=paidEntries.filter(x=>x.type==="expense").reduce((s,x)=>s+Number(x.amount),0);
 const balance=accounts.reduce((s,x)=>s+Number(x.opening_balance),0)+income-expense;
 const remaining=financings.reduce((s,f)=>s+Math.max(0,Number(f.total_amount)-payments.filter(p=>p.financing_id===f.id).reduce((a,p)=>a+Number(p.amount),0)),0);
 const recent=useMemo(()=>entries.slice(0,8),[entries]);

 const saveAccount=async(e:FormEvent)=>{
  e.preventDefault(); if(!accountForm.name.trim()) return;
  setBusy(true);
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setBusy(false);showNotice("Entre novamente na sua conta.");return;}
  const {error}=await supabase.from("personal_financial_accounts").insert({user_id:user.id,name:accountForm.name.trim(),account_type:accountForm.account_type,institution:accountForm.institution.trim()||null,opening_balance:Number(accountForm.opening_balance||0)});
  setBusy(false); if(error){showNotice(error.message);return;}
  setAccountForm({name:"",account_type:"checking",institution:"",opening_balance:"0"});showNotice("Conta pessoal cadastrada.");await reload();
 };
 const saveEntry=async(e:FormEvent)=>{
  e.preventDefault(); if(!entryForm.description.trim()||Number(entryForm.amount)<=0)return;
  setBusy(true);const {data:{user}}=await supabase.auth.getUser();
  if(!user){setBusy(false);showNotice("Entre novamente na sua conta.");return;}
  const {error}=await supabase.from("personal_transactions").insert({...entryForm,user_id:user.id,account_id:entryForm.account_id||null,category:entryForm.category.trim()||null,amount:Number(entryForm.amount),description:entryForm.description.trim()});
  setBusy(false);if(error){showNotice(error.message);return;}
  setEntryForm({type:"expense",description:"",category:"",amount:"",transaction_date:today(),account_id:"",status:"paid"});showNotice("Movimentação pessoal salva.");await reload();
 };
 const saveFinancing=async(e:FormEvent)=>{
  e.preventDefault();const principal=Number(financingForm.principal_amount),total=Number(financingForm.total_amount),installment=Number(financingForm.monthly_installment),count=Number(financingForm.installments_total);
  if(!financingForm.name.trim()||principal<=0||total<principal||installment<=0||count<1){showNotice("Confira os valores do financiamento.");return;}
  setBusy(true);const {data:{user}}=await supabase.auth.getUser();
  if(!user){setBusy(false);showNotice("Entre novamente na sua conta.");return;}
  const {error}=await supabase.from("personal_financings").insert({user_id:user.id,name:financingForm.name.trim(),financing_type:financingForm.financing_type,lender:financingForm.lender.trim()||null,principal_amount:principal,total_amount:total,monthly_installment:installment,installments_total:count,monthly_interest_rate:financingForm.monthly_interest_rate?Number(financingForm.monthly_interest_rate):null,first_due_date:financingForm.first_due_date});
  setBusy(false);if(error){showNotice(error.message);return;}
  setFinancingForm({name:"",financing_type:"vehicle",lender:"",principal_amount:"",total_amount:"",monthly_installment:"",installments_total:"",monthly_interest_rate:"",first_due_date:today()});showNotice("Financiamento cadastrado.");await reload();
 };
 const registerPayment=async()=>{
  if(!paymentTarget||Number(paymentAmount)<=0)return;
  const next=Number(paymentTarget.installments_paid)+1;
  if(next>Number(paymentTarget.installments_total)){showNotice("Todas as parcelas já estão registradas.");return;}
  setBusy(true);const {data:{user}}=await supabase.auth.getUser();
  if(!user){setBusy(false);showNotice("Entre novamente na sua conta.");return;}
  const {error}=await supabase.from("personal_financing_payments").insert({user_id:user.id,financing_id:paymentTarget.id,installment_number:next,amount:Number(paymentAmount),paid_at:paymentDate});
  setBusy(false);if(error){showNotice(error.code==="23505"?"Esta parcela já foi registrada.":error.message);return;}
  setPaymentTarget(null);setPaymentAmount("");showNotice("Parcela registrada no controle do financiamento.");await reload();
 };
 const removeEntry=async(id:string)=>{if(!window.confirm("Excluir esta movimentação pessoal?"))return;const {error}=await supabase.from("personal_transactions").delete().eq("id",id);if(error)showNotice(error.message);else{showNotice("Movimentação excluída.");await reload();}};
 const removeAccount=async(id:string)=>{if(!window.confirm("Desativar esta conta pessoal?"))return;const {error}=await supabase.from("personal_financial_accounts").update({is_active:false,updated_at:new Date().toISOString()}).eq("id",id);if(error)showNotice(error.message);else{showNotice("Conta desativada.");await reload();}};
 const removeFinancing=async(id:string)=>{if(!window.confirm("Arquivar este financiamento? O histórico de parcelas será preservado."))return;const {error}=await supabase.from("personal_financings").update({is_active:false,updated_at:new Date().toISOString()}).eq("id",id);if(error)showNotice(error.message);else{showNotice("Financiamento arquivado.");await reload();}};

 return <section className="personal-finance">
  <div className="personal-heading"><div><span className="eyebrow">AMBIENTE INDIVIDUAL</span><h1>Gestão de Pessoa Física</h1><p>Organize suas contas, receitas, despesas e financiamentos pessoais.</p></div><button className="button-secondary" onClick={()=>void reload()}><RefreshCw size={16}/> Atualizar</button></div>
  <nav className="personal-tabs" aria-label="Seções da gestão pessoal">{([["overview","Visão geral"],["transactions","Movimentações"],["accounts","Contas"],["financings","Financiamentos"]] as [Tab,string][]).map(([key,label])=><button key={key} className={tab===key?"is-active":""} onClick={()=>setTab(key)}>{label}</button>)}</nav>
  {loading?<div className="panel"><p>Carregando seus dados pessoais…</p></div>:<>
   {tab==="overview"&&<><div className="personal-metrics"><article><span>Saldo inicial + resultado</span><strong>{money(balance)}</strong><small>Contas e movimentações pagas</small></article><article><span>Receitas pagas</span><strong>{money(income)}</strong><small><TrendingUp size={14}/> Entradas registradas</small></article><article><span>Despesas pagas</span><strong>{money(expense)}</strong><small><TrendingDown size={14}/> Saídas registradas</small></article><article><span>Financiamentos restantes</span><strong>{money(remaining)}</strong><small>Estimativa baseada nas parcelas cadastradas</small></article></div><div className="panel personal-list"><div className="personal-section-title"><h2>Movimentações recentes</h2><button className="button-secondary" onClick={()=>setTab("transactions")}>Ver todas</button></div>{recent.length?recent.map(x=><div className="personal-row" key={x.id}><div><strong>{x.description}</strong><small>{x.category||"Sem categoria"} · {new Date(x.transaction_date+"T12:00:00").toLocaleDateString("pt-BR")}</small></div><b className={x.type==="income"?"positive":"negative"}>{x.type==="income"?"+":"−"} {money(Number(x.amount))}</b></div>):<p className="personal-empty">Nenhuma movimentação cadastrada. Comece registrando sua primeira receita ou despesa.</p>}</div></>}
   {tab==="transactions"&&<div className="personal-columns"><form className="panel personal-form" onSubmit={saveEntry}><h2>Nova movimentação</h2><label>Tipo<select value={entryForm.type} onChange={e=>setEntryForm({...entryForm,type:e.target.value as "income"|"expense"})}><option value="expense">Despesa</option><option value="income">Receita</option></select></label><label>Descrição<input required maxLength={180} value={entryForm.description} onChange={e=>setEntryForm({...entryForm,description:e.target.value})} placeholder="Ex.: Supermercado, salário"/></label><label>Categoria<input value={entryForm.category} onChange={e=>setEntryForm({...entryForm,category:e.target.value})} placeholder="Ex.: Alimentação"/></label><label>Valor (R$)<input required type="number" min="0.01" step="0.01" value={entryForm.amount} onChange={e=>setEntryForm({...entryForm,amount:e.target.value})}/></label><label>Data<input required type="date" value={entryForm.transaction_date} onChange={e=>setEntryForm({...entryForm,transaction_date:e.target.value})}/></label><label>Conta<select value={entryForm.account_id} onChange={e=>setEntryForm({...entryForm,account_id:e.target.value})}><option value="">Sem conta vinculada</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>Status<select value={entryForm.status} onChange={e=>setEntryForm({...entryForm,status:e.target.value as "paid"|"pending"})}><option value="paid">Efetivada</option><option value="pending">Pendente</option></select></label><button className="button-primary" disabled={busy}><Plus size={16}/> Salvar movimentação</button></form><div className="panel personal-list"><h2>Histórico pessoal</h2>{entries.length?entries.map(x=><div className="personal-row" key={x.id}><div><strong>{x.description}</strong><small>{x.category||"Sem categoria"} · {new Date(x.transaction_date+"T12:00:00").toLocaleDateString("pt-BR")} · {x.status==="paid"?"Efetivada":x.status==="pending"?"Pendente":"Cancelada"}</small></div><div className="personal-row-actions"><b className={x.type==="income"?"positive":"negative"}>{x.type==="income"?"+":"−"} {money(Number(x.amount))}</b><button className="icon-button" aria-label="Excluir movimentação" onClick={()=>void removeEntry(x.id)}><Trash2 size={15}/></button></div></div>):<p className="personal-empty">Sem movimentações cadastradas.</p>}</div></div>}
   {tab==="accounts"&&<div className="personal-columns"><form className="panel personal-form" onSubmit={saveAccount}><h2>Nova conta pessoal</h2><label>Nome da conta<input required maxLength={100} value={accountForm.name} onChange={e=>setAccountForm({...accountForm,name:e.target.value})} placeholder="Ex.: Conta principal"/></label><label>Tipo<select value={accountForm.account_type} onChange={e=>setAccountForm({...accountForm,account_type:e.target.value})}>{Object.entries(accountTypes).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>Banco ou instituição<input value={accountForm.institution} onChange={e=>setAccountForm({...accountForm,institution:e.target.value})}/></label><label>Saldo inicial (R$)<input type="number" step="0.01" value={accountForm.opening_balance} onChange={e=>setAccountForm({...accountForm,opening_balance:e.target.value})}/></label><button className="button-primary" disabled={busy}><Plus size={16}/> Cadastrar conta</button></form><div className="panel personal-list"><h2>Minhas contas</h2>{accounts.length?accounts.map(a=><div className="personal-row" key={a.id}><div><strong>{a.name}</strong><small>{accountTypes[a.account_type]||"Conta"}{a.institution?" · "+a.institution:""} · Saldo inicial: {money(Number(a.opening_balance))}</small></div><button className="icon-button" aria-label="Desativar conta" onClick={()=>void removeAccount(a.id)}><Trash2 size={15}/></button></div>):<p className="personal-empty">Cadastre sua primeira conta pessoal.</p>}</div></div>}
   {tab==="financings"&&<><div className="personal-columns"><form className="panel personal-form" onSubmit={saveFinancing}><h2>Novo financiamento ou empréstimo</h2><label>Descrição<input required value={financingForm.name} onChange={e=>setFinancingForm({...financingForm,name:e.target.value})} placeholder="Ex.: Financiamento do carro"/></label><label>Tipo<select value={financingForm.financing_type} onChange={e=>setFinancingForm({...financingForm,financing_type:e.target.value})}>{Object.entries(types).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>Banco ou credor<input value={financingForm.lender} onChange={e=>setFinancingForm({...financingForm,lender:e.target.value})}/></label><label>Valor financiado (R$)<input required type="number" min="0.01" step="0.01" value={financingForm.principal_amount} onChange={e=>setFinancingForm({...financingForm,principal_amount:e.target.value})}/></label><label>Total a pagar no contrato (R$)<input required type="number" min="0.01" step="0.01" value={financingForm.total_amount} onChange={e=>setFinancingForm({...financingForm,total_amount:e.target.value})}/></label><label>Valor da parcela (R$)<input required type="number" min="0.01" step="0.01" value={financingForm.monthly_installment} onChange={e=>setFinancingForm({...financingForm,monthly_installment:e.target.value})}/></label><label>Quantidade de parcelas<input required type="number" min="1" step="1" value={financingForm.installments_total} onChange={e=>setFinancingForm({...financingForm,installments_total:e.target.value})}/></label><label>Juros mensal (%) · opcional<input type="number" min="0" step="0.0001" value={financingForm.monthly_interest_rate} onChange={e=>setFinancingForm({...financingForm,monthly_interest_rate:e.target.value})}/></label><label>Vencimento da 1ª parcela<input required type="date" value={financingForm.first_due_date} onChange={e=>setFinancingForm({...financingForm,first_due_date:e.target.value})}/></label><button className="button-primary" disabled={busy}><Plus size={16}/> Cadastrar financiamento</button></form><div className="panel personal-list"><h2>Meus financiamentos</h2>{financings.length?financings.map(f=>{const paid=payments.filter(p=>p.financing_id===f.id).reduce((s,p)=>s+Number(p.amount),0);const left=Math.max(0,Number(f.total_amount)-paid);return <article className="personal-financing-card" key={f.id}><div className="personal-section-title"><div><strong>{f.name}</strong><small>{types[f.financing_type]||"Financiamento"}{f.lender?" · "+f.lender:""}</small></div><button className="icon-button" aria-label="Arquivar financiamento" onClick={()=>void removeFinancing(f.id)}><Trash2 size={15}/></button></div><div className="personal-financing-stats"><span>Saldo estimado <b>{money(left)}</b></span><span>Parcelas <b>{f.installments_paid}/{f.installments_total}</b></span><span>Parcela <b>{money(Number(f.monthly_installment))}</b></span></div><div className="personal-progress"><i style={{width:(Number(f.installments_paid)/Number(f.installments_total)*100)+"%"}}/></div><small>Total contratado: {money(Number(f.total_amount))} · Valor financiado: {money(Number(f.principal_amount))}</small><button className="button-secondary" disabled={f.installments_paid>=f.installments_total} onClick={()=>{setPaymentTarget(f);setPaymentAmount(String(f.monthly_installment));setPaymentDate(today());}}>Registrar parcela paga</button></article>}) : <p className="personal-empty">Nenhum financiamento cadastrado.</p>}</div></div>{paymentTarget&&<div className="personal-payment-modal"><form className="panel personal-form" onSubmit={e=>{e.preventDefault();void registerPayment();}}><h2>Registrar parcela · {paymentTarget.name}</h2><p>Parcela {Number(paymentTarget.installments_paid)+1} de {paymentTarget.installments_total}</p><label>Valor pago (R$)<input required type="number" min="0.01" step="0.01" value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)}/></label><label>Data do pagamento<input required type="date" value={paymentDate} onChange={e=>setPaymentDate(e.target.value)}/></label><div className="personal-form-actions"><button type="button" className="button-secondary" onClick={()=>setPaymentTarget(null)}>Cancelar</button><button className="button-primary" disabled={busy}>Confirmar parcela</button></div></form></div>}</>}
  </>}
  <p className="personal-disclaimer"><ShieldNote/> Seus dados pessoais ficam separados dos registros empresariais. O saldo de financiamentos é uma estimativa calculada pelos valores cadastrados, não substitui o saldo oficial informado pelo credor. Registrar uma parcela aqui atualiza o controle, mas não realiza pagamento ao banco.</p>
 </section>;
}
function ShieldNote(){return <span aria-hidden="true">🔒</span>}
