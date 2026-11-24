import { useState } from "react";

type Props = { onNotice: (message: string) => void };

const sections = [
  { id: "privacy", label: "Privacidade", title: "Política de Privacidade", text: [
    "Este texto é um resumo de interface. A política integral está em docs/legal/PRIVACY_POLICY_DRAFT.md e ainda precisa de revisão jurídica e identificação do controlador.",
    "O serviço deve coletar somente dados necessários para conta, segurança e funcionalidades solicitadas. Dados financeiros de terceiros inseridos pelo cliente exigem base legal e transparência.",
    "Não usar dados dos usuários para treinar IA por padrão. Não enviar dados a provedores externos de IA sem avaliação, informação clara e autorização/base legal aplicável.",
    "Pedidos de acesso, correção ou exclusão precisam de canal seguro, verificação proporcional e processamento no servidor. Esse fluxo ainda não está conectado."
  ]},
  { id: "terms", label: "Termos", title: "Termos de Uso", text: [
    "O NEXUS FINANCE está em demonstração. Números, registros e organizações exibidos são ilustrativos; não use para decisões reais.",
    "Antes da produção, o cadastro deverá apresentar a versão dos Termos e da Política de Privacidade e registrar o aceite obrigatório no servidor, separado de marketing.",
    "Planos e preços atuais são exemplos. Não há cobrança, renovação automática ou contratação real conectada nesta demonstração."
  ]},
  { id: "cookies", label: "Cookies", title: "Cookies e tecnologias semelhantes", text: [
    "Cookies estritamente necessários podem suportar segurança e sessão. Analytics, publicidade e rastreamento não essencial devem permanecer bloqueados até consentimento.",
    "O banner permite registrar uma escolha local neste navegador. Isso não substitui um gerenciador de consentimento nem comprova que scripts externos estão bloqueados.",
    "Antes de produção, auditar cookies, SDKs, pixels, analytics, armazenamento local e chamadas de terceiros."
  ]},
  { id: "refund", label: "Cancelamento e reembolso", title: "Cancelamento e reembolso", text: [
    "Não há assinatura ou cobrança real nesta versão. Antes de vender, informar preço total, periodicidade, tributos, renovação automática e data da próxima cobrança.",
    "O cancelamento deverá ser simples, acessível e confirmar a data efetiva. A política definitiva deve respeitar o Código de Defesa do Consumidor e demais normas aplicáveis.",
    "Prazos de reembolso e processamento dependem do contrato e do provedor de pagamento e precisam ser definidos antes do checkout."
  ]}
];

export function LegalCenter({ onNotice }: Props) {
  const [active, setActive] = useState("privacy");
  const [marketing, setMarketing] = useState(false);
  const section = sections.find((item) => item.id === active) ?? sections[0]!;
  return <section className="legal-center" aria-labelledby="legal-title">
    <div className="welcome-row"><div><div className="eyebrow">TRANSPARÊNCIA E CONTROLES</div><h1 id="legal-title">Privacidade e termos</h1><p>Informações claras sobre dados, cookies, condições e direitos.</p></div></div>
    <div className="legal-tabs" role="tablist" aria-label="Documentos legais">
      {sections.map((item) => <button key={item.id} role="tab" aria-selected={active === item.id} className={active === item.id ? "active" : ""} onClick={() => setActive(item.id)}>{item.label}</button>)}
    </div>
    <article className="panel legal-document">
      <div className="eyebrow">DOCUMENTO PRELIMINAR · REVISÃO PENDENTE</div>
      <h2>{section.title}</h2>
      {section.text.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      <p className="legal-warning">Não é aconselhamento jurídico. A versão final depende dos dados da empresa, auditoria técnica e revisão por profissional habilitado.</p>
    </article>
    <article className="panel legal-controls">
      <h2>Preferências e direitos</h2>
      <label className="legal-toggle"><input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} /> Quero receber novidades e ofertas por e-mail (opcional).</label>
      <p className="legal-muted">Esta preferência é apenas demonstrativa e não é enviada nem salva em servidor. Nenhum e-mail de marketing deve ser enviado sem consentimento válido e opção de descadastro em cada mensagem.</p>
      <div className="legal-actions">
        <button className="button-secondary" onClick={() => onNotice("O pedido de acesso/exclusão exige backend e canal de privacidade ainda não configurados.")}>Solicitar acesso ou exclusão de dados</button>
        <button className="button-secondary" onClick={() => onNotice("Canal de privacidade pendente: publique o e-mail oficial antes de receber solicitações reais.")}>Contato de privacidade</button>
      </div>
      <p className="legal-muted">Controlador, CNPJ, endereço, e-mail do Encarregado e lista de suboperadores ainda precisam ser informados. Não envie dados pessoais reais por esta tela.</p>
    </article>
    <div className="demo-disclaimer">Documentos completos e checklist técnico disponíveis em docs/legal. O aceite legal e os pedidos de titulares ainda não possuem registro persistente.</div>
  </section>;
}
