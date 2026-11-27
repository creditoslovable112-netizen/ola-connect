# Correção do reconhecimento PRO
- [x] Corrigir a ponte pública da verificação PRO sem alterar a regra privada ou RLS.
- [x] Unificar o estado de acesso e atualizar após sessão, retorno à aba e durante uso.
- [x] Validar a conta autorizada sob o papel authenticated, isolamento e atualização da expiração; 9 testes passaram. Login real no navegador não disponível para este Supabase externo; informar a limitação.

# Remodelação dos dashboards
- [x] Confirmar a branch feat/nexus-finance-foundation e inspecionar status/diff; gráficos sem JSX truncado.
- [x] Localizar os dois painéis reais e rastrear dados, filtros e gráficos.
- [ ] Aplicar apresentação compartilhada, gráficos e estados sem mudar consultas ou cálculos.
- [ ] Executar lint e testes; conferir preview e informar limitações do login real.