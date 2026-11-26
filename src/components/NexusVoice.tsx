import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, Mic, MicOff, Send, Sparkles, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { createTransaction, listCategories, listCompanies, listFinancialAccounts, type Category, type Company, type FinancialAccount } from "../lib/finance-data";

type VoiceAction = { type: "expense" | "income"; description: string; amount: number; counterparty: string | null; status: "paid" | "pending"; category_name: string | null };
type VoicePlan = { supported: boolean; clarification: string | null; actions: VoiceAction[] };
type SpeechRecognitionAlternativeLike = { transcript: string };
type SpeechRecognitionResultLike = { 0: SpeechRecognitionAlternativeLike };
type SpeechRecognitionEventLike = { results: ArrayLike<SpeechRecognitionResultLike> };
type SpeechRecognitionLike = { lang: string; interimResults: boolean; onresult: ((event: SpeechRecognitionEventLike) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
type SpeechWindow = Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };

const today = () => new Date().toISOString().slice(0, 10);
const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function NexusVoice() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [plan, setPlan] = useState<VoicePlan | null>(null);
  const [message, setMessage] = useState("");
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [accountId, setAccountId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const recognition = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void Promise.all([listFinancialAccounts(), listCategories(undefined, false), listCompanies()])
      .then(([a, c, co]) => {
        if (!alive) return;
        setAccounts(a); setCategories(c); setCompanies(co);
        setAccountId((current) => current || a[0]?.id || "");
        const savedCompany = typeof window !== "undefined" ? window.localStorage.getItem("nexus-active-company") : null;
        setCompanyId((current) => current || (savedCompany && savedCompany !== "all" ? savedCompany : co.length === 1 ? co[0].id : ""));
      })
      .catch((error) => { if (alive) setMessage(error instanceof Error ? error.message : "Não foi possível carregar suas contas."); });
    return () => { alive = false; };
  }, [open]);

  useEffect(() => () => { recognition.current?.stop(); }, []);

  const startListening = () => {
    const Speech = (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;
    if (!Speech) { setMessage("Seu navegador não oferece reconhecimento de voz. Você pode digitar o pedido."); return; }
    try {
      recognition.current?.stop();
      const instance = new Speech();
      instance.lang = "pt-BR";
      instance.interimResults = false;
      instance.onresult = (event) => {
        const spoken = Array.from(event.results).map((result) => result[0]?.transcript ?? "").join(" ").trim();
        if (spoken) setText((current) => current ? current + " " + spoken : spoken);
      };
      instance.onerror = () => { setListening(false); setMessage("Não consegui acessar o microfone. Verifique a permissão do navegador ou digite o pedido."); };
      instance.onend = () => setListening(false);
      recognition.current = instance;
      setMessage("");
      setListening(true);
      instance.start();
    } catch {
      setListening(false);
      setMessage("Não foi possível iniciar o microfone. Tente digitar o pedido.");
    }
  };

  const prepare = async () => {
    if (!text.trim()) return;
    setBusy(true); setMessage(""); setPlan(null);
    try {
      const { data, error } = await supabase.functions.invoke("nexus-voice-prepare", { body: { message: text.trim() } });
      if (error) throw error;
      if (!data || typeof data.supported !== "boolean" || !Array.isArray(data.actions)) throw new Error("A resposta do assistente veio em um formato inválido.");
      setPlan(data as VoicePlan);
      if (!data.supported && data.clarification) setMessage(data.clarification);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não consegui entender o pedido. Tente novamente.");
    } finally { setBusy(false); }
  };

  const confirm = async () => {
    if (!plan?.supported || !plan.actions.length) return;
    if (!accountId) { setMessage("Cadastre ou selecione uma conta financeira antes de confirmar."); return; }
    if (companies.length > 0 && !companyId) { setMessage("Selecione a empresa que receberá os lançamentos."); return; }
    setBusy(true); setMessage("");
    try {
      for (const action of plan.actions) {
        const matchedCategory = categories.find((item) => item.name.toLocaleLowerCase("pt-BR") === (action.category_name ?? "").toLocaleLowerCase("pt-BR"));
        const paidAt = action.status === "paid" ? new Date().toISOString() : null;
        await createTransaction({
          account_id: accountId,
          category_id: matchedCategory?.id ?? null,
          cost_center_id: null,
          supplier_id: null,
          customer_id: null,
          company_id: companyId || null,
          type: action.type,
          description: action.description.trim(),
          counterparty: action.counterparty?.trim() || null,
          amount: action.amount,
          status: action.status,
          transaction_date: today(),
          due_date: today(),
          paid_at: paidAt,
          notes: "Lançamento criado pelo NEXUS VOZ após confirmação do usuário.",
        });
      }
      setMessage(plan.actions.length === 1 ? "Lançamento salvo com sucesso." : plan.actions.length + " lançamentos salvos com sucesso.");
      setPlan(null); setText("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar os lançamentos.");
    } finally { setBusy(false); }
  };

  return <>
    <button className="nexus-voice-fab" aria-label="Abrir NEXUS VOZ" onClick={() => { setOpen(true); setMessage(""); }}><Mic size={21}/><span>NEXUS VOZ</span></button>
    {open && <div className="nexus-voice-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
      <section className="nexus-voice-panel" role="dialog" aria-modal="true" aria-labelledby="nexus-voice-title">
        <header className="nexus-voice-heading"><div className="nexus-voice-mark"><Sparkles size={18}/></div><div><strong id="nexus-voice-title">NEXUS VOZ</strong><small>Fale ou digite o que deseja fazer</small></div><button className="icon-button" aria-label="Fechar" disabled={busy} onClick={() => { recognition.current?.stop(); setOpen(false); }}><X size={19}/></button></header>
        <div className="nexus-voice-body">
          <button className={listening ? "nexus-voice-mic is-listening" : "nexus-voice-mic"} onClick={listening ? () => recognition.current?.stop() : startListening} disabled={busy}><Mic size={23}/><strong>{listening ? "Estou ouvindo…" : "Toque para falar"}</strong><small>{listening ? "Toque novamente para parar" : "O navegador pode pedir acesso ao microfone"}</small></button>
          <label className="nexus-voice-label">Seu pedido<textarea rows={3} maxLength={1200} value={text} onChange={(event) => setText(event.target.value)} placeholder="Ex.: Gastei R$ 20 no cabeleireiro e R$ 6.000 em um iPhone."/></label>
          <button className="button-primary nexus-voice-prepare" onClick={() => void prepare()} disabled={busy || !text.trim()}>{busy ? <LoaderCircle className="nexus-voice-spin" size={16}/> : <Send size={16}/>} Preparar ação</button>
          {message && <p className="nexus-voice-message" role="status">{message}</p>}
          {plan?.supported && plan.actions.length > 0 && <div className="nexus-voice-confirm">
            <strong>Confira antes de confirmar</strong>
            <p>O NEXUS VOZ ainda não salvou nada. Revise os lançamentos abaixo.</p>
            {plan.actions.map((action, index) => <div className="nexus-voice-action" key={index}><span>{action.type === "expense" ? "Despesa" : "Receita"} · {action.description}</span><strong>{money(action.amount)}</strong><small>{action.status === "paid" ? "Marcada como paga" : "Pendente"}{action.counterparty ? " · " + action.counterparty : ""}</small></div>)}
            <label className="nexus-voice-label">Conta financeira<select value={accountId} onChange={(event) => setAccountId(event.target.value)}><option value="">Selecione uma conta</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            {companies.length > 0 && <label className="nexus-voice-label">Empresa<select value={companyId} onChange={(event) => setCompanyId(event.target.value)}><option value="">Selecione uma empresa</option>{companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
            <div className="nexus-voice-confirm-actions"><button className="button-secondary" disabled={busy} onClick={() => setPlan(null)}>Cancelar</button><button className="button-primary" disabled={busy || !accountId || (companies.length > 0 && !companyId)} onClick={() => void confirm()}><Check size={16}/> Confirmar e salvar</button></div>
          </div>}
          {plan && !plan.supported && <div className="nexus-voice-unsupported"><strong>Preciso de mais informações</strong><p>{plan.clarification || "Esse pedido ainda não pode ser executado automaticamente."}</p></div>}
          <p className="nexus-voice-safety">Nenhum dado é alterado antes de você tocar em “Confirmar e salvar”.</p>
        </div>
      </section>
    </div>}
  </>;
}
