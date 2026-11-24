# Plano de performance e operação — NEXUS FINANCE

## Implementado no frontend
- Skeleton de rota com shimmer, layout estável, estado acessível e suporte a `prefers-reduced-motion`.
- TanStack Query configurado com janela de frescor de 30 s, coleta de cache em 5 min, uma repetição e sem refetch automático ao focar a janela. O Query deduplica consultas simultâneas com a mesma query key.
- Helper `src/lib/api-client.ts`: timeout padrão de 10 s, cancelamento, erros HTTP explícitos e deduplicação de GET simultâneo por URL/cabeçalhos.
- `apiParallel` permite agrupar leituras independentes com `Promise.all`.
- As alterações locais já atualizam o estado React imediatamente; quando existir API, usar atualização otimista do TanStack Query e rollback em erro.

## Ainda não implementado / depende de serviço externo
Este repositório ainda é uma demonstração sem endpoints financeiros, banco de dados, autenticação ou API operacional. O helper é infraestrutura pronta para integração, mas não cria endpoints nem dispara chamadas por conta própria.

### API e banco de dados
- Definir query keys estáveis e compartilhar a mesma query key para evitar chamadas duplicadas.
- Em cada consulta SQL, selecionar somente as colunas necessárias; não usar `SELECT *`. Aplicar paginação e índices conforme consultas reais e plano de execução.
- Executar em paralelo apenas consultas independentes. Manter sequenciais as operações que dependem umas das outras.
- Usar atualização otimista apenas em operações reversíveis, com rollback e tratamento de conflito.
- Validar timeout, retry, cancelamento e limites de concorrência no servidor também.

### CDN, compressão e cache
- O projeto usa configuração Nitro/Cloudflare do template Lovable. O comentário de `vite.config.ts` e o servidor indicam que a hospedagem comprime respostas na borda. Não adicionar compressão manual no app: dupla compressão pode corromper respostas.
- Na hospedagem de produção, confirmar CDN ativa para assets estáticos, TLS, HTTP/2 ou HTTP/3, Brotli quando aceito pelo cliente e GZIP como fallback.
- Servir assets com hash em nome e `Cache-Control: public, max-age=31536000, immutable`; HTML e respostas personalizadas devem ter política de cache separada. Nunca colocar dados privados em cache público.
- Não é possível habilitar CDN ou Brotli/GZIP apenas por commit no frontend; depende da conta e configuração do provedor.

### OpenTelemetry
- Não há SDK, collector, endpoint OTLP nem backend de observabilidade configurados. Não enviar telemetria para um destino inventado.
- Antes de ativar, escolher collector/fornecedor, endpoint OTLP, política de amostragem, retenção, controle de acesso e mascaramento de dados.
- Instrumentar spans de API no servidor e propagação de trace ID; registrar duração, status e rota, sem payloads, tokens, dados bancários ou dados pessoais.
- Definir alertas de latência p95/p99 e taxa de erro por endpoint.

### Scripts de terceiros
- Carregar analytics, chat, pixels e widgets somente após consentimento aplicável; usar `defer`/carregamento sob demanda e auditar cada domínio. Não carregar scripts de terceiros desnecessários.
- A remoção de fontes remotas foi feita anteriormente; ainda é necessária auditoria de runtime/rede completa antes de declarar todos os terceiros bloqueados.

### Hospedagem própria
- A configuração atual é orientada ao deploy Nitro/Cloudflare usado pelo template Lovable. Hospedar em servidor próprio exige escolher provedor/infra, runtime Node compatível, domínio, TLS, variáveis secretas, logs, backups, firewall, atualizações e pipeline de deploy.
- Não alterei o alvo de deploy sem saber o servidor, sistema operacional e provedor desejados. Isso evita quebrar a publicação atual.

## Teste obrigatório em dispositivos e redes lentas
1. Testar larguras 320, 360, 390, 768 e 1280 px; Android físico e Safari/iOS.
2. Em DevTools, simular Fast 3G/Slow 4G e CPU 4x slowdown; medir LCP, INP, CLS, TTFB e tamanho transferido.
3. Validar skeleton, navegação, menus, tabelas, formulários, erros e reconexão sem overflow horizontal.
4. Confirmar headers `content-encoding: br` ou `gzip` em assets grandes, cache-control e CDN pelo domínio real.
5. Repetir os testes no ambiente publicado. Preview de desenvolvimento não comprova comportamento de produção.

## Critério de conclusão
Só marcar CDN, compressão, servidor próprio, telemetria, otimização SQL e testes móveis como concluídos depois de validar no ambiente publicado com infraestrutura e endpoints reais.
