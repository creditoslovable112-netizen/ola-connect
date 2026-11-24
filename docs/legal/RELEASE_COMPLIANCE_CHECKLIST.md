# Checklist de lançamento — Privacidade, consumidor, acessibilidade e licenças

**Status geral: NÃO LIBERADO PARA PUBLICAÇÃO COMERCIAL.** Itens marcados como implementados precisam passar por teste no preview e validação operacional. Itens jurídicos e empresariais dependem do responsável e de revisão profissional.

## Implementado no código / banco (validar no preview)
- [x] Checkbox obrigatório no cadastro para Termos e Política; marketing separado e desmarcado por padrão.
- [x] Trigger do Supabase registra versão, usuário, finalidade, concessão e data/hora no servidor.
- [x] Preferência de cookies com botões de rejeitar opcionais e aceitar todos.
- [x] Registro de preferências de cookies para usuário autenticado.
- [x] Nenhum SDK conhecido de analytics, pixel publicitário ou rastreador foi encontrado na branch auditada.
- [x] Formulário autenticado registra pedidos de acesso, exclusão, correção e portabilidade.
- [x] RLS habilitada nas tabelas de consentimentos e solicitações, com isolamento por usuário.
- [x] Documentos e política de retenção publicados como rascunhos identificados.
- [x] Avisos de não cobrança/renovação na versão atual e de ausência de campanhas de marketing configuradas.
- [x] Componentes legais com labels, foco visível, semântica de abas e controles operáveis por teclado.

## Identidade e contratos — bloqueadores
- [ ] Preencher razão social, CNPJ, endereço físico e contato oficial no site e documentos.
- [ ] Indicar e publicar encarregado ou canal oficial de privacidade, conforme regra aplicável.
- [ ] Revisão final da Política, Termos, Cookies e Reembolso por advogado(a) brasileiro(a).
- [ ] Assinar/validar contratos e DPAs dos fornecedores reais; confirmar suboperadores, localização e transferência internacional.
- [ ] Firmar DPA com clientes que atuem como controladores e NEXUS como operador.
- [ ] Confirmar responsável, fluxo e prazo interno para atender pedidos de titulares.
- [ ] Definir responsáveis e plano testado de resposta a incidentes; comunicar ANPD e titulares quando exigido no prazo regulamentar.

## Dados, retenção e exclusão — pendentes de operação
- [ ] Aprovar prazos de retenção por categoria com jurídico/contador.
- [ ] Implementar descarte automatizado, ciclo de backups, bloqueio e anonimização; testar restauração.
- [ ] Implementar exportação de dados e exclusão efetiva de conta, incluindo Auth, dados operacionais, backups e fornecedores.
- [ ] Verificar identidade de titulares proporcionalmente e registrar respostas/justificativas.
- [ ] Auditar todos os campos para minimizar coleta e impedir dados excessivos.
- [ ] Definir processo específico para dados de crianças/adolescentes, melhor interesse e consentimento parental quando aplicável.

## Cookies, marketing e e-mail
- [x] Botão de recusa de cookies não essenciais.
- [x] Marketing separado de Termos/Política e não pré-selecionado.
- [ ] Executar teste de rede no preview e domínio publicado antes de qualquer escolha; nenhum tracker não essencial pode carregar.
- [ ] Implementar mecanismo real de descadastro e lista de supressão antes de enviar campanhas.
- [ ] Garantir link funcional de descadastro em todos os e-mails promocionais e testar revogação.

## Consumidor e oferta
- [x] A versão atual informa que não há checkout, cobrança ou renovação automática ativa.
- [ ] Antes de vender, mostrar preço total, tributos, periodicidade, taxas e renovação automática antes do aceite.
- [ ] Implementar cancelamento simples no mesmo ambiente da contratação.
- [ ] Implementar e testar arrependimento de 7 dias quando o CDC art. 49 for aplicável, e reembolso.
- [ ] Garantir confirmação de contratação, contrato/recibo e canal de atendimento eletrônico.
- [ ] Revisar toda afirmação comercial; remover urgência falsa, cronômetros artificiais, avaliações fictícias e promessas não comprovadas.

## Conteúdo, imagem, fonte e código
- [ ] Confirmar autoria/licença e permissões do arquivo public/nexus-mark.webp e public/favicon.ico.
- [ ] Auditar licenças de todas as dependências de produção e gerar inventário/SBOM.
- [ ] Conferir licenças de fontes, ícones e quaisquer imagens adicionadas pelo Lovable.
- [ ] Manter NOTICE, atribuições e avisos exigidos pelas licenças.
- [ ] Confirmar que nenhum logotipo, nome, depoimento ou avaliação de cliente é usado sem autorização escrita.

## Acessibilidade
- [x] Texto alternativo descritivo para o logo NEXUS no cabeçalho.
- [x] Labels nos controles de consentimento e formulário de direitos.
- [x] Foco visível e navegação por teclado nos controles do centro de privacidade.
- [ ] Auditar contraste de todas as telas e estados.
- [ ] Testar leitor de tela, zoom 200%, teclado sem mouse, mensagens de erro e ordem de foco em toda a aplicação.

## Validação final
- [ ] CI verde no commit final.
- [ ] Teste manual de signup/aceite, cookie reject/accept, marketing opt-in/revoke e histórico de consentimento.
- [ ] Teste de RLS com dois usuários diferentes.
- [ ] Teste do formulário de acesso/exclusão e atendimento operacional.
- [ ] Aprovação jurídica, de segurança e do responsável pelo produto.
