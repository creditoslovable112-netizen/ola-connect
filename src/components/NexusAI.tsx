import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Send, Sparkles, UserRound, LoaderCircle, ShieldCheck, RotateCcw } from "lucide-react";
import { supabase } from "../lib/supabase";

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
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [notice, setNotice] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    void supabase.functions.invoke("nexus-ai", { body: { action: "status" } })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) { setConfigured(false); return; }
        setConfigured(Boolean(data?.configured));
      });
    return () => { active = false; };
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, sending]);

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const prompt = input.trim();
    if (!prompt || sending) return;
    if (configured === false) { setNotice("Para ativar, crie uma chave gratuita no Google AI Studio e salve-a no Supabase como secret GEMINI_API_KEY. Depois atualize esta página."); return; }
    if (prompt.length > 1200) { setNotice("Sua mensagem deve ter até 1.200 caracteres."); return; }
    setNotice("");
    setMessages((current) => [...current, { role: "user", text: prompt }]);
    setInput("");
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("nexus-ai", { body: { message: prompt } });
      if (error) throw error;
      if (!data?.reply) throw new Error("O assistente não retornou uma resposta.");
      setMessages((current) => [...current, { role: "assistant", text: String(data.reply) }]);
      setConfigured(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível conectar ao NEXUS AI.";
      setNotice(message.includes("GEMINI_API_KEY") || message.includes("not configured")
        ? "O NEXUS AI está quase pronto. Falta adicionar a chave gratuita do Google AI Studio como secret no Supabase."
        : message.includes("429") ? "Limite temporário atingido. Aguarde um pouco e tente novamente."
        : "Não consegui responder agora. Verifique se a chave do assistente foi configurada e tente novamente.");
      setConfigured(false);
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
        <span className={configured ? "nexus-ai-status is-online" : "nexus-ai-status"}>
          <i/> {configured === null ? "Verificando" : configured ? "Conectado" : "Aguardando chave"}
        </span>
      </header>

      <div className="nexus-ai-chat panel">
        <div className="nexus-ai-chat-head">
          <div className="nexus-ai-avatar"><Bot size={20}/></div>
          <div><strong>Assistente NEXUS</strong><small>Gemini Flash · camada gratuita</small></div>
          <button type="button" className="icon-button" aria-label="Limpar conversa" onClick={() => { setMessages([{ role: "assistant", text: "Conversa reiniciada! Como posso ajudar?" }]); setNotice(""); }}><RotateCcw size={16}/></button>
        </div>
        {configured === false && <div className="nexus-ai-setup"><strong>Falta só uma configuração</strong><span>O chat já está instalado. Adicione a chave gratuita do Google AI Studio no secret <code>GEMINI_API_KEY</code> do Supabase e recarregue esta tela.</span><a href="https://aistudio.google.com/api-keys" target="_blank" rel="noreferrer">Criar chave gratuita no Google AI Studio</a></div>}
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
          <button type="submit" className="button-primary" disabled={sending || !input.trim() || configured === false} aria-label="Enviar mensagem"><Send size={17}/></button>
        </form>
        {notice && <p className="nexus-ai-notice" role="alert">{notice}</p>}
        <div className="nexus-ai-privacy"><ShieldCheck size={15}/><span>Privacidade: não envie senhas, números de cartão, CPF ou dados bancários. No plano gratuito do Google, os prompts podem ser usados para melhoria dos produtos do Google.</span></div>
      </div>
      <div className="nexus-ai-footnote">Uso sujeito aos limites gratuitos do provedor. O NEXUS AI não substitui orientação contábil, jurídica ou financeira profissional.</div>
    </section>
  );
}
