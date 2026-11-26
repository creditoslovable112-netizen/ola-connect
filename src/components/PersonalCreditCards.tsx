import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, CreditCard, Receipt, RefreshCw, Trash2, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabase";

type CardRow={id:string;name:string;issuer:string|null;last_four:string|null;credit_limit:number;closing_day:number;due_day:number};
type Purchase={id:string;card_id:string;description:string;category:string|null;purchase_date:string;total_amount:number;installments:number;first_statement_month:string};
type Payment={id:string;card_id:string;statement_month:string;amount:number;paid_at:string};
const money=(n:number)=>Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const today=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
const monthNow=()=>today().slice(0,7)+"-01";
const monthLabel=(m:string)=>new Date(m+"T12:00:00").toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
const shiftMonth=(m:string,n:number)=>{const d=new Date(m+"T12:00:00");d.setMonth(d.getMonth()+n);return d.toISOString().slice(0,10)};
const installmentValue=(p:Purchase,index:number)=>{const cents=Math.round(Number(p.total_amount)*100);const base=Math.floor(cents/p.installments);return (index===p.installments-1?cents-base*(p.installments-1):base)/100};
function statementAmount(purchases:Purchase[],cardId:string,month:string){return purchases.reduce((sum,p)=>{const delta=(new Date(month+"T12:00:00").getFullYear()-new Date(p.first_statement_month+"T12:00:00").getFullYear())*12+new Date(month+"T12:00:00").getMonth()-new Date(p.first_statement_month+"T12:00:00").getMonth();return sum+(p.card_id===cardId&&delta>=0&&delta<p.installments?installmentValue(p,delta):0)},0)}
export function PersonalCreditCards({showNotice}:{showNotice:(m:string)=>void}){
 const [cards,setCards]=useState<CardRow[]>([]),[purchases,setPurchases]=useState<Purchase[]>([]),[payments,setPayments]=useState<Payment[]>([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [selectedCard,setSelectedCard]=useState("");
 const [month,setMonth]=useState(monthNow());
 const [cardForm,setCardForm]=useState({name:"",issuer:"",last_four:"",credit_limit:"",closing_day:"10",due_day:"17"});
 const [purchaseForm,setPurchaseForm]=useState({description:"",category:"",purchase_date:today(),total_amount:"",installments:"1",first_statement_month:monthNow()});
 const [paymentAmount,setPaymentAmount]=useState("");
 const reload=useCallback(async()=>{setLoading(true);try{const [c,p,pa]=await Promise.all([
 supabase.from("personal_credit_cards").select("id,name,issuer,last_four,credit_limit,closing_day,due_day").eq("is_active",true).order("name"),
 supabase.from("personal_card_purchases").select("id,card_id,description,category,purchase_date,total_amount,installments,first_statement_month").order("purchase_date",{ascending:false}),
 supabase.from("personal_card_statement_payments").select("id,card_id,statement_month,amount,paid_at").order("paid_at",{ascending:false})
 ]);for(const r of [c,p,pa])if(r.error)throw r.error;setCards((c.data||[]) as CardRow[]);setPurchases((p.data||[]) as Purchase[]);setPayments((pa.data||[]) as Payment[]);if(!selectedCard&&c.data?.[0])setSelectedCard(c.data[0].id)}catch(e){showNotice(e instanceof Error?e.message:"Erro ao carregar cartões.")}finally{setLoading(false)}},[selectedCard,showNotice]);
 useEffect(()=>{void reload()},[reload]);
 const activeCard=cards.find(c=>c.id===selectedCard);
 const statement=activeCard?statementAmount(purchases,activeCard.id,month):0;
 const paid=payments.filter(p=>p.card_id===selectedCard&&p.statement_month===month).reduce((s,p)=>s+Number(p.amount),0);
 const outstanding=Math.max(0,statement-paid);
 const cardUsage=activeCard?Math.max(0,purchases.filter(p=>p.card_id===activeCard.id).reduce((s,p)=>s+Number(p.total_amount),0)-payments.filter(p=>p.card_id===activeCard.id).reduce((s,p)=>s+Number(p.amount),0)):0;
 const availableLimit=activeCard?Math.max(0,Number(activeCard.credit_limit)-cardUsage):0;
 const currentPurchases=useMemo(()=>purchases.filter(p=>p.card_id===selectedCard),[purchases,selectedCard]);
 const saveCard=async(e:FormEvent)=>{e.preventDefault();if(!cardForm.name.trim()||Number(cardForm.credit_limit)<=0)return;setBusy(true);const {data:{user}}=await supabase.auth.getUser();if(!user){setBusy(false);showNotice("Entre novamente na sua conta.");return}const {error}=await supabase.from("personal_credit_cards").insert({user_id:user.id,name:cardForm.name.trim(),issuer:cardForm.issuer.trim()||null,last_four:cardForm.last_four||null,credit_limit:Number(cardForm.credit_limit),closing_day:Number(cardForm.closing_day),due_day:Number(cardForm.due_day)});setBusy(false);if(error){showNotice(error.message);return}setCardForm({name:"",issuer:"",last_four:"",credit_limit:"",closing_day:"10",due_day:"17"});showNotice("Cartão cadastrado.");await reload()};
 const savePurchase=async(e:FormEvent)=>{e.preventDefault();if(!selectedCard||!purchaseForm.description.trim()||Number(purchaseForm.total_amount)<=0)return;setBusy(true);const {data:{user}}=await supabase.auth.getUser();if(!user){setBusy(false);showNotice("Entre novamente na sua conta.");return}const {error}=await supabase.from("personal_card_purchases").insert({user_id:user.id,card_id:selectedCard,description:purchaseForm.description.trim(),category:purchaseForm.category.trim()||null,purchase_date:purchaseForm.purchase_date,total_amount:Number(purchaseForm.total_amount),installments:Number(purchaseForm.installments),first_statement_month:purchaseForm.first_statement_month+"-01"});setBusy(false);if(error){showNotice(error.message);return}setPurchaseForm({description:"",category:"",purchase_date:today(),total_amount:"",installments:"1",first_statement_month:monthNow()});showNotice("Compra registrada na fatura.");await reload()};
 const payStatement=async()=>{if(!activeCard||outstanding<=0)return;const amount=Number(paymentAmount||outstanding);if(amount<=0||amount>outstanding){showNotice("O pagamento precisa ser maior que zero e não pode ultrapassar o saldo da fatura.");return}setBusy(true);const {data:{user}}=await supabase.auth.getUser();if(!user){setBusy(false);showNotice("Entre novamente na sua conta.");return}const {error}=await supabase.from("personal_card_statement_payments").insert({user_id:user.id,card_id:activeCard.id,statement_month:month,amount,paid_at:today()});setBusy(false);if(error){showNotice(error.message);return}setPaymentAmount("");showNotice("Pagamento registrado no controle da fatura. Nenhum pagamento bancário foi realizado.");await reload()};
 const removePurchase=async(id:string)=>{if(!window.confirm("Excluir esta compra e suas parcelas futuras?"))return;const {error}=await supabase.from("personal_card_purchases").delete().eq("id",id);if(error)showNotice(error.message);else{showNotice("Compra excluída.");await reload()}};
 const removeCard=async(id:string)=>{if(!window.confirm("Arquivar este cartão? As compras e faturas históricas serão preservadas."))return;const {error}=await supabase.from("personal_credit_cards").update({is_active:false,updated_at:new Date().toISOString()}).eq("id",id);if(error)showNotice(error.message);else{showNotice("Cartão arquivado.");setSelectedCard("");await reload()}};
 if(loading)return <div className="panel"><p>Carregando seus cartões…</p></div>;
 return <div className="personal-columns personal-card-columns">
  <div className="personal-card-left">
   <form className="panel personal-form" onSubmit={saveCard}><h2><CreditCard size={18}/> Novo cartão</h2>
    <label>Nome do cartão<input required maxLength={80} value={cardForm.name} onChange={e=>setCardForm({...cardForm,name:e.target.value})} placeholder="Ex.: Cartão principal"/></label>
    <label>Banco ou emissor<input value={cardForm.issuer} onChange={e=>setCardForm({...cardForm,issuer:e.target.value})} placeholder="Ex.: Nubank"/></label>
    <label>Últimos 4 números (opcional)<input inputMode="numeric" maxLength={4} pattern="[0-9]{4}" value={cardForm.last_four} onChange={e=>setCardForm({...cardForm,last_four:e.target.value.replace(/\D/g,"").slice(0,4)})} placeholder="1234"/></label>
    <label>Limite total (R$)<input required type="number" min="0.01" step="0.01" value={cardForm.credit_limit} onChange={e=>setCardForm({...cardForm,credit_limit:e.target.value})}/></label>
    <div className="personal-inline-fields"><label>Fecha dia<input required type="number" min="1" max="31" value={cardForm.closing_day} onChange={e=>setCardForm({...cardForm,closing_day:e.target.value})}/></label><label>Vence dia<input required type="number" min="1" max="31" value={cardForm.due_day} onChange={e=>setCardForm({...cardForm,due_day:e.target.value})}/></label></div>
    <button className="button-primary" disabled={busy}><Plus size={16}/> Cadastrar cartão</button>
   </form>
   <form className="panel personal-form" onSubmit={savePurchase}><h2><Receipt size={18}/> Nova compra</h2>
    {cards.length===0?<p className="personal-empty">Cadastre um cartão para começar.</p>:<>
     <label>Cartão<select required value={selectedCard} onChange={e=>setSelectedCard(e.target.value)}>{cards.map(c=><option key={c.id} value={c.id}>{c.name}{c.last_four?" •••• "+c.last_four:""}</option>)}</select></label>
     <label>Descrição<input required maxLength={180} value={purchaseForm.description} onChange={e=>setPurchaseForm({...purchaseForm,description:e.target.value})} placeholder="Ex.: Compra no mercado"/></label>
     <label>Categoria<input value={purchaseForm.category} onChange={e=>setPurchaseForm({...purchaseForm,category:e.target.value})} placeholder="Ex.: Alimentação"/></label>
     <label>Data da compra<input required type="date" value={purchaseForm.purchase_date} onChange={e=>setPurchaseForm({...purchaseForm,purchase_date:e.target.value})}/></label>
     <label>Valor total (R$)<input required type="number" min="0.01" step="0.01" value={purchaseForm.total_amount} onChange={e=>setPurchaseForm({...purchaseForm,total_amount:e.target.value})}/></label>
     <label>Parcelas<select value={purchaseForm.installments} onChange={e=>setPurchaseForm({...purchaseForm,installments:e.target.value})}>{Array.from({length:48},(_,i)=>i+1).map(n=><option key={n} value={n}>{n===1?"À vista":n+" vezes"}</option>)}</select></label>
     <label>Primeira fatura<input required type="month" value={purchaseForm.first_statement_month.slice(0,7)} onChange={e=>setPurchaseForm({...purchaseForm,first_statement_month:e.target.value+"-01"})}/></label>
     <button className="button-primary" disabled={busy}><Plus size={16}/> Lançar compra</button>
    </>}
   </form>
  </div>
  <div className="panel personal-list">
   <div className="personal-section-title"><h2>Meus cartões</h2><button className="button-secondary" onClick={()=>void reload()}><RefreshCw size={15}/> Atualizar</button></div>
   {cards.length===0?<p className="personal-empty">Nenhum cartão cadastrado.</p>:cards.map(c=><button key={c.id} className={"personal-card-tile "+(selectedCard===c.id?"selected":"")} onClick={()=>setSelectedCard(c.id)}><span><CreditCard size={19}/><strong>{c.name}</strong></span><small>{c.issuer||"Cartão"} {c.last_four?"•••• "+c.last_four:""}</small><b>Limite {money(Number(c.credit_limit))}</b><small>Fecha dia {c.closing_day} · Vence dia {c.due_day}</small></button>)}
   {activeCard&&<><div className="personal-section-title"><h2>Fatura do cartão</h2><button className="icon-button" aria-label="Arquivar cartão" onClick={()=>void removeCard(activeCard.id)}><Trash2 size={16}/></button></div>
    <label className="personal-month-select">Mês da fatura<input type="month" value={month.slice(0,7)} onChange={e=>setMonth(e.target.value+"-01")}/></label>
    <div className="personal-metrics personal-card-metrics"><article><span>Total da fatura</span><strong>{money(statement)}</strong><small>{monthLabel(month)}</small></article><article><span>Já registrado como pago</span><strong>{money(paid)}</strong><small>Pagamentos informados</small></article><article><span>Falta pagar</span><strong>{money(outstanding)}</strong><small>Controle manual</small></article><article><span>Limite comprometido estimado</span><strong>{money(cardUsage)}</strong><small>Saldo de compras menos pagamentos</small></article><article><span>Limite disponível estimado</span><strong>{money(availableLimit)}</strong><small>Não consultado no banco</small></article></div>
    <div className="personal-payment-entry"><label>Valor pago (R$)<input type="number" min="0.01" max={outstanding.toFixed(2)} step="0.01" value={paymentAmount} placeholder={outstanding.toFixed(2)} onChange={e=>setPaymentAmount(e.target.value)}/></label><button className="button-primary" disabled={busy||outstanding<=0} onClick={()=>void payStatement()}><CheckCircle2 size={16}/> Registrar pagamento</button></div>
    <h3>Compras e parcelas</h3>
    {currentPurchases.length?currentPurchases.map(p=><div className="personal-row" key={p.id}><div><strong>{p.description}</strong><small>{p.category||"Sem categoria"} · {new Date(p.purchase_date+"T12:00:00").toLocaleDateString("pt-BR")} · {p.installments}x de {money(Number(p.total_amount)/p.installments)} · começa {monthLabel(p.first_statement_month)}</small></div><div className="personal-row-actions"><b>{money(Number(p.total_amount))}</b><button className="icon-button" aria-label="Excluir compra" onClick={()=>void removePurchase(p.id)}><Trash2 size={15}/></button></div></div>):<p className="personal-empty">Nenhuma compra registrada para este cartão.</p>}
   </>}
   <p className="personal-disclaimer">As faturas são projeções calculadas a partir das compras e do mês informado como primeira fatura. Registre o pagamento após pagar no banco. O NEXUS não consulta o emissor, não confirma o limite disponível e não realiza pagamentos.</p>
  </div>
 </div>
}
