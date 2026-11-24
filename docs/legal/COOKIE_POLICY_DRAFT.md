# Política de Cookies — NEXUS FINANCE

**Versão:** 1.0-2026-11-24  
**Status:** rascunho sujeito à auditoria técnica do ambiente de publicação.

## 1. O que são

Cookies e tecnologias semelhantes podem armazenar ou acessar informações no navegador. A classificação deve considerar finalidade, duração, fornecedor e dados tratados.

## 2. Tecnologias estritamente necessárias

O produto pode utilizar armazenamento local necessário à autenticação, persistência de sessão, segurança e funcionamento solicitado. A biblioteca de autenticação Supabase pode manter tokens de sessão no armazenamento do navegador. Esse armazenamento não deve ser reutilizado para publicidade ou perfilamento.

## 3. Tecnologias não essenciais

Analytics, medição de desempenho, pixels de publicidade, rastreamento comportamental e conteúdo incorporado não essencial não devem ser carregados antes de uma escolha válida. Na branch atual não foram encontrados imports ou chamadas conhecidas de Google Analytics/gtag, PostHog, Hotjar, Microsoft Clarity ou Meta Pixel; a inspeção do código não substitui teste de rede no preview e no domínio de produção.

## 4. Escolhas

O banner permite rejeitar os opcionais ou aceitar todos. A recusa deve ser tão fácil quanto aceitar. A escolha é armazenada no navegador e, quando autenticado, registrada no histórico de consentimentos da conta. O usuário pode limpar a preferência do navegador para escolher novamente. Consentimento para marketing é separado.

## 5. Auditoria antes do lançamento

- Inspecionar cookies, localStorage, sessionStorage, IndexedDB, service workers e requests de rede.
- Testar em janela anônima, antes e depois de aceitar/rejeitar.
- Inspecionar scripts e integrações adicionados pelo Lovable e pelo domínio publicado.
- Garantir que nenhum fornecedor opcional receba dados antes do consentimento.
- Registrar finalidade, base legal, duração e fornecedor de cada tecnologia.
