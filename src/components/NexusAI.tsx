import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { requireWorkspaceId } from "../lib/finance-data";
import { Bot, Send, Sparkles, UserRound, LoaderCircle, RotateCcw, ChevronRight, BookOpen } from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; text: string };
type FAQ = { category: string; question: string; answer: string };

const faq: FAQ[] = [
  { category: "Visão geral", question: "O que é o NEXUS FINANCE?", answer: "O NEXUS FINANCE reúne ferramentas para acompanhar a rotina financeira de uma empresa em um só lugar. Pelo menu lateral você acessa o Dashboard, contas a pagar e receber, fluxo de caixa, transações, contas bancárias, relatórios, categorias, clientes, fornecedores e empresas." },
  { category: "Visão geral", question: "Como começo a usar o aplicativo?", answer: "Comece pelo Dashboard para ter uma visão geral. Depois cadastre suas contas bancárias, categorias, clientes e fornecedores. Em seguida, registre contas a pagar, valores a receber e transações para organizar seu fluxo financeiro." },
  { category: "Visão geral", question: "Para que serve o Dashboard?", answer: "O Dashboard é o resumo da operação: apresenta indicadores financeiros, gráficos e informações recentes para ajudar você a acompanhar entradas, saídas e a situação do negócio. Use os filtros de período disponíveis para mudar a visualização." },
  { category: "Visão geral", question: "Como navego pelo aplicativo no celular?", answer: "No celular, toque no botão de menu no topo para abrir a navegação lateral. Escolha a área desejada; o menu fecha e a página selecionada aparece. Use os botões e formulários da própria tela para cadastrar ou consultar informações." },
  { category: "Contas a pagar", question: "Como cadastro uma conta a pagar?", answer: "Abra Contas a pagar no menu e toque em Nova conta. Informe a descrição, fornecedor, categoria, valor e vencimento e confirme em Adicionar conta. Confira os dados antes de salvar." },
  { category: "Contas a pagar", question: "Como vejo contas vencidas ou pendentes?", answer: "Na tela Contas a pagar, use o filtro de situação para exibir todas, pendentes, vencidas ou pagas. A busca também permite localizar uma despesa pela descrição ou pelo fornecedor." },
  { category: "Contas a pagar", question: "Como marco uma conta como paga?", answer: "Localize a conta na lista e toque em Marcar pago. O status muda na tela. Em versões demonstrativas, algumas alterações podem existir somente durante a sessão; confira o aviso exibido na própria página." },
  { category: "Contas a receber", question: "Como cadastro um valor que tenho para receber?", answer: "Entre em Contas a receber e toque em Nova cobrança. Preencha descrição, cliente, categoria, valor e vencimento. Depois confirme em Criar cobrança." },
  { category: "Contas a receber", question: "Como acompanho cobranças atrasadas?", answer: "Na página Contas a receber, consulte o resumo de valores em atraso e use o filtro de situação para localizar cobranças vencidas. A busca ajuda a encontrar pelo nome da cobrança ou do cliente." },
  { category: "Contas a receber", question: "Como confirmo que recebi um pagamento?", answer: "Encontre a cobrança na lista e toque em Marcar recebido. O status será atualizado na tela. Verifique o aviso da página para saber se a alteração está persistida ou é apenas demonstrativa." },
  { category: "Fluxo de caixa", question: "O que mostra o Fluxo de caixa?", answer: "O Fluxo de caixa organiza entradas e saídas por data e ajuda a comparar valores realizados com valores previstos. Ele oferece uma visão do saldo e da projeção para apoiar o planejamento." },
  { category: "Fluxo de caixa", question: "Como vejo uma previsão financeira?", answer: "Abra Fluxo de caixa e ajuste o horizonte de visualização disponível. Observe as entradas e saídas previstas e compare o saldo projetado com o realizado. Previsões dependem de lançamentos cadastrados corretamente." },
  { category: "Transações", question: "Onde consulto minhas transações?", answer: "Acesse Transações pelo menu Financeiro. Nessa área você pode consultar os lançamentos e usar os filtros e ações disponíveis na tela para localizar informações." },
  { category: "Transações", question: "Qual a diferença entre entrada e saída?", answer: "Entrada é um valor que entra no caixa, como uma venda ou recebimento. Saída é um valor pago pela empresa, como aluguel, fornecedores ou despesas operacionais. Registrar os dois corretamente ajuda a entender o resultado do período." },
  { category: "Contas bancárias", question: "Como organizo minhas contas bancárias?", answer: "Abra Contas bancárias para consultar e gerenciar as contas usadas no controle financeiro. Cadastre ou atualize as informações solicitadas na tela e confira se cada lançamento está associado à conta correta." },
  { category: "Relatórios", question: "Para que servem os relatórios?", answer: "A área Relatórios reúne visões para acompanhar o desempenho e analisar os registros financeiros. Escolha os filtros disponíveis e confira o período e os critérios antes de usar os números em decisões." },
  { category: "Categorias", question: "O que são categorias e centros de custo?", answer: "Categorias classificam receitas e despesas, por exemplo, vendas, infraestrutura ou tecnologia. Centros de custo ajudam a identificar qual área, projeto ou unidade gerou determinado gasto. Essa organização facilita análises e relatórios." },
  { category: "Categorias", question: "Como crio uma categoria?", answer: "Entre em Categorias e centros de custo e use a ação de adicionar disponível na página. Escolha um nome claro e consistente para facilitar a classificação dos lançamentos." },
  { category: "Clientes e fornecedores", question: "Onde cadastro meus clientes?", answer: "Abra Clientes no menu Gestão e use a opção de adicionar cadastro. Preencha os campos solicitados e revise os dados antes de salvar." },
  { category: "Clientes e fornecedores", question: "Onde cadastro meus fornecedores?", answer: "Acesse Fornecedores no menu Gestão. Use a opção de novo cadastro, informe os dados solicitados e salve. Manter os fornecedores organizados facilita o controle das contas a pagar." },
  { category: "Empresas e equipe", question: "Posso gerenciar mais de uma empresa?", answer: "O seletor de workspace no topo do menu lateral permite visualizar as opções de empresa disponíveis na interface. A disponibilidade de dados e permissões para múltiplas empresas depende da configuração ativa da sua conta." },
  { category: "Empresas e equipe", question: "Onde gerencio a equipe e permissões?", answer: "A opção Equipe aparece na área Gestão. Os controles completos de usuários e permissões ainda podem depender de uma etapa de configuração da plataforma. Não presuma que um membro foi convidado até receber a confirmação na tela." },
  { category: "Assinatura", question: "Como funcionam os planos?", answer: "A área Assinatura apresenta opções de planos e seus recursos. Nesta versão, os planos exibidos são informativos e o checkout/cobrança real pode ainda não estar conectado. Não considere uma assinatura ativa apenas por selecionar um plano." },
  { category: "Configurações", question: "Como altero idioma, moeda e fuso horário?", answer: "Abra Configurações, escolha o idioma, a moeda e o fuso horário desejados e toque em Salvar preferências. As preferências são armazenadas no perfil da sua conta." },
  { category: "Configurações", question: "Como ativo as notificações?", answer: "Na página Configurações, marque ou desmarque Receber notificações no aplicativo e salve as preferências. A disponibilidade de alertas específicos depende dos recursos de notificação habilitados na plataforma." },
  { category: "Privacidade e segurança", question: "Onde leio os termos e a política de privacidade?", answer: "Acesse Privacidade e termos pelo menu Plataforma. Lá você encontra os documentos e as opções de gerenciamento de consentimento disponíveis." },
  { category: "Privacidade e segurança", question: "Como protejo minha conta?", answer: "Use uma senha exclusiva e forte, não compartilhe códigos de acesso e encerre a sessão em dispositivos compartilhados. Nunca envie senha, CPF, número de cartão ou dados bancários nesta conversa de ajuda." },
  { category: "Ajuda", question: "Este assistente usa inteligência artificial?", answer: "Não. As perguntas frequentes usam respostas preparadas pela equipe. A análise financeira do plano PRO usa IA e considera somente um resumo agregado dos dados financeiros autorizados." },
  { category: "Ajuda", question: "Posso escrever uma pergunta diferente?", answer: "Por enquanto, este assistente responde às perguntas disponíveis na lista. Escolha uma categoria para encontrar assuntos relacionados e selecione a pergunta que mais se aproxima da sua dúvida. Novas perguntas e respostas podem ser adicionadas à biblioteca." },
];

const categories = ["Todas", ...Array.from(new Set(faq.map((item) => item.category)))];
const welcome = "Olá! Sou o NEXUS AI. Posso responder dúvidas sobre o aplicativo e, no plano PRO, analisar um resumo dos seus dados financeiros reais. Escolha uma pergunta ou solicite uma análise.";

export function NexusAI({ environment, hasProAccess }: { environment: "business" | "personal"; hasProAccess: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", text: welcome }]);
  const [category, setCategory] = useState("Todas");
  const [selected, setSelected] = useState<FAQ | null>(null);
  const [sending, setSending] = useState(false);
  const [analysisPeriod, setAnalysisPeriod] = useState("6");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, sending]);

  const send = () => {
    if (!selected || sending) return;
    const question = selected;
    setMessages((current) => [...current, { role: "user", text: question.question }]);
    setSelected(null);
    setSending(true);
    window.setTimeout(() => {
      setMessages((current) => [...current, { role: "assistant", text: question.answer }]);
      setSending(false);
    }, 650);
  };

  const analyzeFinances = async () => {
    if (sending || !hasProAccess) return;
    const question = environment === "personal" ? "Analisar minhas finanças pessoais" : "Analisar minhas finanças empresariais";
    setMessages((current) => [...current, { role: "user", text: question + " · últimos " + analysisPeriod + " meses" }]);
    setSending(true);
    try {
      const workspaceId = environment === "business" ? await requireWorkspaceId() : undefined;
      const savedCompany = environment === "business" ? window.localStorage.getItem("nexus-active-company") : null;
      const companyId = savedCompany && savedCompany !== "all" ? savedCompany : undefined;
      const { data, error } = await supabase.functions.invoke("nexus-ai", {
        body: { action: "analyze-finances", environment, workspace_id: workspaceId, company_id: companyId, period_months: Number(analysisPeriod) }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.reply) throw new Error("A análise não retornou um resultado.");
      setMessages((current) => [...current, { role: "assistant", text: data.reply }]);
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", text: error instanceof Error ? error.message : "Não foi possível analisar seus dados agora." }]);
    } finally { setSending(false); }
  };

  const restart = () => {
    setMessages([{ role: "assistant", text: welcome }]);
    setSelected(null);
    setCategory("Todas");
    setSending(false);
  };

  const visibleQuestions = faq.filter((item) => category === "Todas" || item.category === category);

  return (
    <section className="nexus-ai-page">
      <header className="nexus-ai-hero">
        <div className="nexus-ai-orb"><BookOpen size={26}/></div>
        <div className="nexus-ai-heading">
          <div className="eyebrow">CENTRAL DE AJUDA</div>
          <h1>Assistente NEXUS</h1>
          <p>Tire suas dúvidas sobre as funções e os recursos do aplicativo.</p>
        </div>
        <span className="nexus-ai-status is-online"><i/> Disponível</span>
      </header>

      <div className="nexus-ai-chat panel">
        <div className="nexus-ai-chat-head">
          <div className="nexus-ai-avatar"><Bot size={20}/></div>
          <div><strong>Assistente NEXUS</strong><small>Respostas instantâneas sobre o aplicativo</small></div>
          <button type="button" className="icon-button" aria-label="Reiniciar conversa" onClick={restart}><RotateCcw size={16}/></button>
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

        <div className="nexus-ai-question-area">
          {hasProAccess && <div className="nexus-ai-analysis-box"><div><strong>Análise financeira com IA</strong><p>Use um resumo agregado dos dados do ambiente {environment === "personal" ? "pessoal" : "empresarial"} para identificar tendências e riscos.</p></div><select aria-label="Período da análise" value={analysisPeriod} onChange={event=>setAnalysisPeriod(event.target.value)}><option value="3">3 meses</option><option value="6">6 meses</option><option value="12">12 meses</option></select><button type="button" className="button-primary" onClick={analyzeFinances} disabled={sending}><Sparkles size={16}/> Analisar meus dados</button></div>}
          <div className="nexus-ai-question-title"><Sparkles size={16}/> Escolha uma pergunta</div>
          <div className="nexus-ai-categories" aria-label="Categorias de perguntas">
            {categories.map((item) => <button type="button" key={item} className={category === item ? "is-selected" : ""} onClick={() => { setCategory(item); setSelected(null); }}>{item}</button>)}
          </div>
          <div className="nexus-ai-question-list">
            {visibleQuestions.map((item) => (
              <button type="button" key={item.question} className={selected?.question === item.question ? "is-selected" : ""} onClick={() => setSelected(item)}>
                <span>{item.question}</span><ChevronRight size={16}/>
              </button>
            ))}
          </div>
          {selected && <div className="nexus-ai-selected"><span>Pergunta selecionada</span><strong>{selected.question}</strong></div>}
        </div>
        <div className="nexus-ai-composer">
          <div className="nexus-ai-composer-hint">{selected ? "Pronto para enviar sua pergunta" : "Selecione uma pergunta acima para continuar"}</div>
          <button type="button" className="button-primary" onClick={send} disabled={!selected || sending}><Send size={17}/> Enviar pergunta</button>
        </div>
        <div className="nexus-ai-privacy"><BookOpen size={15}/><span>As dúvidas comuns usam respostas preparadas. A análise PRO envia à IA apenas resumos agregados de valores e categorias, sem descrições individuais, senhas ou dados bancários.</span></div>
      </div>
      <div className="nexus-ai-footnote">As orientações explicam como usar o aplicativo. Os recursos disponíveis podem variar conforme a configuração da sua conta.</div>
    </section>
  );
}
