# Inventário inicial de ativos e licenças — NEXUS FINANCE

**Data da inspeção:** 24/11/2026  
**Escopo:** branch feat/nexus-finance-foundation. Inspeção estática do repositório; não é parecer jurídico nem auditoria completa de dependências.

## Imagens e marcas
- `public/nexus-mark.webp`: ativo local usado como marca NEXUS. O histórico do repositório não comprova autoria, titularidade ou licença de terceiros. **Responsável pelo produto deve confirmar por escrito que possui os direitos ou autorização de uso.**
- `public/favicon.ico`: ativo local. Origem e licença não estão documentadas; confirmar autoria ou licença.
- Não foram encontrados arquivos de logotipos de clientes nem imagens externas de terceiros no diretório `public` durante a inspeção. Revalidar se novos assets forem adicionados.
- Não usar marca, nome, avaliação, depoimento ou estudo de caso de cliente sem autorização escrita.

## Fontes
- O CSS declara famílias DM Sans, Manrope e Inter em regras locais, mas a inspeção não encontrou `@font-face` nem importação remota de fontes. A interface utiliza fallback do sistema quando a fonte não está instalada.
- Não foi encontrado carregamento de Google Fonts ou CDN de fontes no CSS/HTML inspecionado.
- Se uma fonte for incorporada ou servida localmente no futuro, registrar arquivo, versão, fornecedor e licença, incluindo obrigações de atribuição.

## Ícones e bibliotecas
- `lucide-react` declara licença ISC; conferir e preservar o arquivo LICENSE da versão efetivamente instalada. Fonte oficial: https://github.com/lucide-icons/lucide
- React declara licença MIT; preservar avisos aplicáveis. Fonte oficial: https://github.com/facebook/react
- As demais dependências diretas e transitivas ainda precisam de relatório completo por versão instalada (incluindo licenças múltiplas, copyleft, NOTICE e dependências opcionais). O projeto instalou 529 pacotes na execução de CI inspecionada; não é correto afirmar que todas as licenças foram liberadas sem inventário automatizado e revisão.

## Código próprio
- O repositório não contém um arquivo LICENSE próprio identificado na raiz. Definir a licença do código do NEXUS antes de distribuição pública, se aplicável, e confirmar direitos sobre código criado por colaboradores/contratados.
- Manter atribuições e avisos de dependências de terceiros. Não remover cabeçalhos de copyright.

## Pendências de liberação
- [ ] Responsável confirma titularidade/licença de `nexus-mark.webp` e `favicon.ico`.
- [ ] Gerar SBOM/inventário de dependências da versão exata do lockfile.
- [ ] Revisar licenças de todas as dependências diretas e transitivas e suas obrigações de distribuição.
- [ ] Confirmar licença de qualquer fonte/imagem adicional antes de incorporar.
- [ ] Definir licença do código próprio e preservar NOTICE/licenças de terceiros.
