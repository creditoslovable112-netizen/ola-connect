import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, FileText, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { listMyPrivacyConsents, listMyPrivacyRequests, recordMyConsent, submitPrivacyRequest, TERMS_VERSION, PRIVACY_VERSION, MARKETING_VERSION, type PrivacyConsent, type PrivacyRequest } from "../lib/privacy";

type Props = { onNotice: (message: string) => void; onAccepted?: () => void };
type SectionId = "privacy" | "terms" | "cookies" | "retention" | "rights" | "consumer";
const sections: { id: SectionId; label: string; title: string }[] = [
  { id: "privacy", label: "Privacidade", title: "Política de Privacidade" },
  { id: "terms", label: "Termos de Uso", title: "Termos de Uso" },
  { id: "cookies", label: "Cookies", title: "Cookies e tecnologias semelhantes" },
  { id: "retention", label: "Retenção", title: "Retenção e descarte de dados" },
  { id: "rights", label: "Seus direitos", title: "Direitos do titular e solicitações" },
  { id: "consumer", label: "Compras e cancelamento", title: "Informações comerciais e direitos do consumidor" },
];

export function LegalCenter({ onNotice, onAccepted }: Props) {
  const [active, setActive] = useState<SectionId>("privacy");
  const [consents, setConsents] = useState<PrivacyConsent[]>([]);
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [marketing, setMarketing] = useState(false);
  const [confirmDocuments, setConfirmDocuments] = useState(false);
  const [requestType, setRequestType] = useState<"access" | "deletion" | "correction" | "portability" | "other">("access");
  const [requestDescription, setRequestDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const section = sections.find((item) => item.id === active) ?? sections[0]!;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [nextConsents, nextRequests] = await Promise.all([listMyPrivacyConsents(), listMyPrivacyRequests()]);
      setConsents(nextConsents);
      setRequests(nextRequests);
      const marketingRecord = nextConsents.find((item) => item.purpose === "marketing");
      setMarketing(marketingRecord?.granted ?? false);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Não foi possível carregar seus registros de privacidade.");
    } finally { setLoading(false); }
  }, [onNotice]);

  useEffect(() => { void refresh(); }, [refresh]);

  const acceptCurrentDocuments = async () => {
    setSaving(true);
    try {
      await recordMyConsent("terms", true, TERMS_VERSION, "privacy_center");
      await recordMyConsent("privacy", true, PRIVACY_VERSION, "privacy_center");
      await refresh();
      onNotice("Aceite dos Termos e da Política registrado no servidor.");
      onAccepted?.();
    } catch (error) { onNotice(error instanceof Error ? error.message : "Não foi possível registrar o aceite."); }
    finally { setSaving(false); }
  };

  const updateMarketing = async (granted: boolean) => {
    setMarketing(granted);
    setSaving(true);
    try {
      await recordMyConsent("marketing", granted, MARKETING_VERSION, "privacy_center");
      await refresh();
      onNotice(granted ? "Preferência de marketing registrada." : "Consentimento de marketing revogado.");
    } catch (error) {
      setMarketing(!granted);
      onNotice(error instanceof Error ? error.message : "Não foi possível salvar sua preferência.");
    } finally { setSaving(false); }
  };

  const sendRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRequestLoading(true);
    try {
      await submitPrivacyRequest(requestType, requestDescription);
      setRequestDescription("");
      await refresh();
      onNotice("Solicitação registrada. A equipe responsável deverá validar sua identidade e tratar o pedido.");
    } catch (error) { onNotice(error instanceof Error ? error.message : "Não foi possível enviar a solicitação."); }
    finally { setRequestLoading(false); }
  };

  const latest = (purpose: string) => consents.find((item) => item.purpose === purpose);
  const status = (purpose: string) => {
    const item = latest(purpose);
    return item ? (item.granted ? "Aceito" : "Recusado / revogado") : "Ainda não registrado";
  };

  return <section className="legal-center" aria-labelledby="legal-title">
    <div className="welcome-row"><div><div className="eyebrow">TRANSPARÊNCIA, DIREITOS E CONTROLES</div><h1 id="legal-title">Privacidade e termos</h1><p>Consulte documentos, gerencie consentimentos e envie solicitações sobre seus dados.</p></div></div>
    <div className="legal-tabs" role="tablist" aria-label="Documentos e controles de privacidade">
      {sections.map((item) => <button key={item.id} type="button" role="tab" aria-selected={active === item.id} aria-controls="legal-panel" className={active === item.id ? "active" : ""} onClick={() => setActive(item.id)}>{item.label}</button>)}
    </div>
    <article id="legal-panel" role="tabpanel" className="panel legal-document">
      <div className="eyebrow">VERSÃO 1.0 · 24/11/2026 · DOCUMENTO PRELIMINAR</div>
      <h2>{section.title}</h2>
      {active === "privacy" && <>
        <h3>1. Controlador e contato</h3><p>Controlador: <strong>dados empresariais pendentes de confirmação pelo responsável pelo NEXUS FINANCE</strong>. Razão social, CNPJ, endereço e canal de contato/Encarregado ainda não foram fornecidos. Não publicaremos dados fictícios. Esta identificação é requisito bloqueador para lançamento público.</p>
        <h3>2. Dados tratados e finalidade</h3><p>O produto deve tratar apenas os dados necessários à criação e segurança da conta, autenticação, suporte solicitado e funcionalidades financeiras escolhidas. Campos livres podem conter dados de clientes, fornecedores e colaboradores inseridos pelo próprio usuário; o usuário deve possuir base legal e transparência para esses registros. Não solicitar dados sensíveis, documentos pessoais ou dados de crianças sem necessidade, avaliação e base legal específica.</p>
        <h3>3. Bases legais e compartilhamento</h3><p>A base legal será definida por finalidade, conforme a LGPD: execução de contrato ou procedimentos preliminares, cumprimento de obrigação legal, exercício regular de direitos, legítimo interesse com avaliação aplicável e consentimento quando necessário. Hospedagem, autenticação e infraestrutura podem envolver fornecedores como Supabase e Lovable; a lista completa de suboperadores, países, transferências internacionais e contratos ainda precisa ser validada antes da produção.</p>
        <h3>4. Marketing e IA</h3><p>Marketing é opcional, separado do aceite dos Termos e da Política e pode ser revogado. Nenhuma campanha de marketing deve ser enviada até existir um provedor de e-mail configurado, contrato adequado e descadastro funcional em todas as mensagens. Dados financeiros não devem ser enviados a modelos externos nem usados para treinar IA sem avaliação, transparência e base legal aplicável.</p>
        <h3>5. Crianças e adolescentes</h3><p>O serviço é destinado a adultos e empresas, não a crianças. Não coletamos intencionalmente dados de crianças para cadastro. Se o cliente inserir dados pessoais de crianças em seus registros, deverá comprovar a base legal e, quando exigido pelo art. 14 da LGPD, obter consentimento específico e destacado de pelo menos um dos pais ou responsável legal, observando sempre o melhor interesse. O tratamento não deve começar sem essa validação.</p>
        <h3>6. Segurança e incidentes</h3><p>O banco utiliza políticas de Row Level Security para separar registros por usuário. Isso não substitui auditoria de aplicação, gestão de acessos, backups, testes e contratos com operadores. Incidentes com risco ou dano relevante devem ser avaliados e comunicados pelo controlador à ANPD e aos titulares, quando aplicável, no prazo regulamentar de três dias úteis contado do conhecimento de que o incidente afetou dados pessoais, observadas exceções e regras específicas para agentes de pequeno porte. Não existe notificação automática de incidentes nesta versão.</p>
        <h3>7. Encarregado</h3><p>Canal de privacidade e identidade/contato do Encarregado: <strong>pendentes de indicação pelo controlador</strong>. Essa informação precisa ser preenchida e publicada antes do lançamento.</p>
      </>}
      {active === "terms" && <>
        <h3>1. Aceitação e versão</h3><p>O cadastro exige aceite afirmativo dos Termos de Uso e da Política de Privacidade. O consentimento opcional de marketing é independente. O sistema registra no servidor o usuário, a finalidade, a versão do documento e a data/hora do registro; não usa apenas um checkbox local como comprovante.</p>
        <h3>2. Escopo e disponibilidade</h3><p>O NEXUS FINANCE oferece recursos de gestão financeira conforme disponibilidade e funcionalidades efetivamente liberadas. Não prometa funcionalidades, suporte, disponibilidade, integrações, segurança certificada ou resultados que não tenham sido implementados e verificados. Recursos ainda em demonstração devem ser identificados como tais; dados de exemplo não podem ser confundidos com dados reais.</p>
        <h3>3. Responsabilidades e dados de terceiros</h3><p>O usuário deve proteger credenciais, revisar lançamentos e ter base legal para cadastrar dados de clientes, fornecedores, funcionários ou terceiros. Quando o cliente atuar como controlador e o NEXUS como operador, um Acordo de Tratamento de Dados (DPA) com instruções, suboperadores, segurança, incidentes, assistência e descarte deverá ser firmado antes do uso produtivo.</p>
        <h3>4. Propriedade intelectual e publicidade</h3><p>Marcas, imagens, fontes e código de terceiros só podem ser usados conforme suas licenças e atribuições. Logotipos, nomes, avaliações, depoimentos e estudos de caso de clientes exigem autorização verificável. Não serão exibidas avaliações falsas, cronômetros de urgência artificiais ou promessas sem comprovação.</p>
        <h3>5. Crianças e uso permitido</h3><p>O serviço não é direcionado a crianças. Não crie contas para menores nem insira dados de crianças sem avaliação e consentimento do responsável legal quando exigido pela legislação. É proibido tentar acessar dados de outros usuários ou contornar controles de segurança.</p>
      </>}
      {active === "cookies" && <>
        <h3>Essenciais</h3><p>O armazenamento estritamente necessário pode manter sessão, autenticação, segurança e preferências essenciais. A biblioteca de autenticação pode usar armazenamento local do navegador para persistir a sessão.</p>
        <h3>Opcionais</h3><p>Analytics, publicidade, pixels e rastreadores não essenciais devem permanecer desativados até escolha afirmativa. Nesta versão não foram adicionados provedores de analytics, pixels de publicidade ou scripts de rastreamento. A auditoria final deve confirmar também scripts carregados por terceiros e integrações do ambiente de publicação.</p>
        <h3>Escolha e revogação</h3><p>O banner oferece rejeitar cookies opcionais ou aceitar todos. A escolha de cookies não substitui o consentimento de marketing. Você pode limpar a escolha no navegador e selecionar novamente; a preferência é registrada na conta quando a sessão está autenticada.</p>
      </>}
      {active === "retention" && <>
        <p>Os prazos abaixo são uma proposta operacional para validação jurídica e implementação. Não representam descarte automático já ativo. Obrigações fiscais, regulatórias, exercício de direitos e litígios podem exigir retenção específica e documentada.</p>
        <div className="legal-retention-table"><div><strong>Perfil e conta</strong><span>Durante a conta ativa; exclusão operacional proposta em até 30 dias após encerramento, salvo obrigação legal.</span></div><div><strong>Dados financeiros inseridos</strong><span>Durante a prestação do serviço; iniciar exclusão em até 30 dias após encerramento, respeitando exportação e retenções legais.</span></div><div><strong>Backups</strong><span>Meta proposta de expiração em até 90 dias, após validar ciclo de backup e restauração.</span></div><div><strong>Logs de segurança</strong><span>Meta proposta de até 6 meses, sujeita à validação legal e necessidade de segurança.</span></div><div><strong>Solicitações de suporte</strong><span>Meta proposta de até 12 meses após conclusão, salvo obrigação de preservação.</span></div><div><strong>Solicitações de titulares</strong><span>Meta proposta de até 5 anos após conclusão, com acesso restrito.</span></div><div><strong>Registros de incidentes</strong><span>Pelo menos 5 anos, conforme o Regulamento de Comunicação de Incidente da ANPD.</span></div><div><strong>Documentos fiscais</strong><span>Pelo prazo legal específico de cada documento, definido com contador e jurídico.</span></div><div><strong>Registros de consentimento</strong><span>Meta proposta de até 5 anos após encerramento da conta ou revogação; validar com jurídico, pois não é prazo legal geral.</span></div></div>
        <p>Os processos de exclusão automática, expurgo de backups e anonimização ainda precisam ser implementados e testados.</p>
      </>}
      {active === "rights" && <>
        <p>Você pode solicitar confirmação do tratamento, acesso, correção, anonimização, bloqueio, eliminação quando cabível, portabilidade nos termos aplicáveis, informação sobre compartilhamentos e revogação de consentimentos.</p>
        <p>Use o formulário abaixo. A solicitação será registrada no Supabase e ficará vinculada à sua conta. A equipe responsável ainda precisa validar sua identidade de forma proporcional, responder e executar o pedido. O registro do pedido não significa que a exclusão já foi concluída.</p>
        <p>Solicitações podem estar sujeitas a retenção necessária para cumprir obrigações legais, exercício regular de direitos ou outras hipóteses previstas na LGPD; nesses casos, a justificativa deverá ser informada.</p>
      </>}
      {active === "consumer" && <>
        <h3>Fornecedor e contato</h3><p>Razão social, CNPJ, endereço físico e canal de atendimento: <strong>pendentes de confirmação</strong>. Não há dados empresariais verificados para exibir; preencher antes de publicar e antes de oferecer contratação online.</p>
        <h3>Preços e renovação</h3><p>Nesta versão não há checkout, cobrança ou assinatura recorrente ativos. Não existe renovação automática em funcionamento. Antes de vender, o checkout deverá mostrar preço total, periodicidade, tributos, taxas, data e regra de renovação e condições de cancelamento, sem cobranças ocultas. A renovação automática deverá ser informada de forma destacada e aceita antes da contratação.</p>
        <h3>Arrependimento, cancelamento e reembolso</h3><p>Nas contratações abrangidas pelo art. 49 do Código de Defesa do Consumidor, será respeitado o prazo legal de arrependimento de 7 dias e a restituição aplicável. O cancelamento de assinatura deverá estar disponível no mesmo ambiente em que foi contratada, com confirmação da solicitação e data efetiva. Nenhuma assinatura poderá ser ativada sem política de reembolso e fluxo de cancelamento testados.</p>
        <h3>Marketing por e-mail</h3><p>O consentimento é opcional e separado. Quando houver campanhas, cada e-mail deverá conter link funcional e visível de descadastro. Até que esse fluxo esteja integrado e testado, não enviar e-mails promocionais.</p>
      </>}
      <p className="legal-warning">Documento preliminar para revisão jurídica. Controlador, CNPJ, endereço, Encarregado, suboperadores, prazos definitivos e contratos precisam ser confirmados antes da publicação comercial.</p>
    </article>

    <article className="panel legal-controls">
      <div className="panel-heading"><div><h2>Registros e preferências</h2><p>Consentimentos separados e histórico armazenado no servidor.</p></div><ShieldCheck size={20}/></div>
      {loading ? <p>Carregando registros…</p> : <div className="legal-consent-status"><div><span>Termos de Uso</span><strong>{status("terms")}</strong></div><div><span>Política de Privacidade</span><strong>{status("privacy")}</strong></div><div><span>Marketing</span><strong>{status("marketing")}</strong></div><div><span>Cookies opcionais</span><strong>{status("cookies")}</strong></div></div>}
      <label className="legal-toggle"><input type="checkbox" checked={confirmDocuments} onChange={(event) => setConfirmDocuments(event.target.checked)}/> Li e aceito a versão atual dos Termos de Uso e da Política de Privacidade.</label>
      <button className="button-secondary" disabled={saving || !confirmDocuments} onClick={() => void acceptCurrentDocuments()}><CheckCircle2 size={16}/> Registrar meu aceite</button>
      <label className="legal-toggle"><input type="checkbox" checked={marketing} disabled={saving} onChange={(event) => void updateMarketing(event.target.checked)}/> Aceito receber novidades e ofertas por e-mail (opcional).</label>
      <p className="legal-muted">A opção de marketing não é condição para usar o serviço. Não há campanhas configuradas; nenhum e-mail promocional será enviado até existir um mecanismo de descadastro funcional em cada mensagem.</p>
    </article>

    <article className="panel legal-controls">
      <div className="panel-heading"><div><h2>Solicitar acesso ou exclusão</h2><p>Seu pedido será registrado para análise da equipe responsável.</p></div><LockKeyhole size={20}/></div>
      <form className="privacy-request-form" onSubmit={sendRequest}>
        <label>Tipo de solicitação<select value={requestType} onChange={(event) => setRequestType(event.target.value as typeof requestType)}><option value="access">Acesso / cópia dos dados</option><option value="deletion">Exclusão de dados</option><option value="correction">Correção de dados</option><option value="portability">Portabilidade</option><option value="other">Outra solicitação</option></select></label>
        <label>Detalhes (opcional)<textarea value={requestDescription} onChange={(event) => setRequestDescription(event.target.value)} maxLength={1000} rows={3} placeholder="Descreva o pedido sem incluir senhas ou dados sensíveis desnecessários."/></label>
        <button className="button-primary" type="submit" disabled={requestLoading}>{requestLoading ? "Enviando…" : "Enviar solicitação"}</button>
      </form>
      <div className="privacy-request-history"><h3>Histórico de solicitações</h3>{requests.length === 0 ? <p className="legal-muted">Nenhuma solicitação registrada.</p> : requests.map((item) => <div key={item.id}><span>{item.request_type} · {new Date(item.created_at).toLocaleString("pt-BR")}</span><strong>{item.status}</strong></div>)}</div>
    </article>

    <article className="panel legal-controls">
      <h2>Contato e transparência empresarial</h2>
      <p><Mail size={15}/> Canal de privacidade / Encarregado: <strong>pendente de e-mail oficial</strong>.</p>
      <p>Razão social, CNPJ e endereço: <strong>pendentes de confirmação do responsável pelo negócio</strong>.</p>
      <p className="legal-muted">Não inventamos dados de contato nem identificadores empresariais. Esses campos são bloqueadores para publicação pública.</p>
    </article>
    <div className="demo-disclaimer"><FileText size={14}/> Os registros de aceite, marketing e solicitações são persistidos no Supabase com políticas RLS por usuário. O atendimento, a exclusão efetiva, o ciclo de retenção e a resposta legal ainda dependem de processos operacionais e responsáveis definidos.</div>
  </section>;
}
