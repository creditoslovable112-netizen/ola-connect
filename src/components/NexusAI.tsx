import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Send, Sparkles, UserRound, LoaderCircle, ShieldCheck, RotateCcw } from "lucide-react";
import { supabase } from "../lib/supabase";
import { askNexusAI } from "../lib/nexus-ai.functions";

type ChatMessage = { role: "user" | "assistant"; text: string };

const suggestions = [
  "Como organizar melhor meu fluxo de caixa?",
  "Qual a diferença entre lucro e faturamento?",
  "Como montar uma reserva de emergência?",
];

export function NexusAI() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "Olá! Eu sou o NEXUS AI. Posso ajudar com dúvidas gerais sobre gestão financeira, organização, fluxo de caixa e planejamento. O que você gostaria de saber?" },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, sending]);

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const prompt = input.trim();
    if (!prompt || sending) return;
    if (prompt.length > 1200) { setNotice("Sua mensagem deve ter até 1.200 caracteres."); return; }
    setNotice("");
    const history = [...messages, { role: "user" as const, text: prompt }];
    setMessages(history);
    setInput("");
    setSending(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) { setNotice("Entre na sua conta para usar o NEXUS AI."); return; }
      const res = await askNexusAI({ data: { accessToken: token, messages: history.slice(1) } });
      if (res.ok) setMessages((current) => [...current, { role: "assistant", text: res.reply }]);
      else setNotice(res.error);
    } catch {
      setNotice("Não consegui responder agora. Tente novamente em instantes.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="nexus-ai-page">
      <header className="nexus-ai-hero">
        <div className="nexus-ai-orb"><Sparkles size={26}/></div>
        <div className="nexus-ai-heading">
          <div className="eyebrow">NEXUS INTELLIGENCE</div>
          <h1>NEXUS AI</h1>
          <p>Seu assistente inteligente para aprender e tomar decisões com mais clareza.</p>
        </div>
        <span className="nexus-ai-status is-online"><i/> Conectado</span>
      </header>

      <div className="nexus-ai-chat panel">
        <div className="nexus-ai-chat-head">
          <div className="nexus-ai-avatar"><Bot size={20}/></div>
          <div><strong>Assistente NEXUS</strong><small>Google Gemini</small></div>
          <button type="button" className="icon-button" aria-label="Limpar conversa" onClick={() => { setMessages([{ role: "assistant", text: "Conversa reiniciada! Como posso ajudar?" }]); setNotice(""); }}><RotateCcw size={16}/></button>
        </div>
        <div className="nexus-ai-messages" aria-live="polite">
          {messages.map((message, index) => (
            <div className={`nexus-ai-message ${message.role}`} key={index}>
              <span className="nexus-ai-message-icon">{message.role === "assistant" ? <Bot size={16}/> : <UserRound size={16}/>}</span>
              <p>{message.text}</p>
            </div>
          ))}
          {sending && <div className="nexus-ai-message assistant"><span className="nexus-ai-message-icon"><Bot size={16}/></span><p className="nexus-ai-typing"><LoaderCircle size={15}/> Pensando…</p></div>}
          <div ref={endRef}/>
        </div>
        {messages.length === 1 && <div className="nexus-ai-suggestions">{suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => setInput(suggestion)}>{suggestion}</button>)}</div>}
        <form className="nexus-ai-composer" onSubmit={send}>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="Pergunte ao NEXUS AI..." rows={2} maxLength={1200} disabled={sending}/>
          <button type="submit" className="button-primary" disabled={sending || !input.trim()} aria-label="Enviar mensagem"><Send size={17}/></button>
        </form>
        {notice && <p className="nexus-ai-notice" role="alert">{notice}</p>}
        <div className="nexus-ai-privacy"><ShieldCheck size={15}/><span>Privacidade: não envie senhas, números de cartão, CPF ou dados bancários.</span></div>
      </div>
      <div className="nexus-ai-footnote">O NEXUS AI não substitui orientação contábil, jurídica ou financeira profissional.</div>
    </section>
  );
}
