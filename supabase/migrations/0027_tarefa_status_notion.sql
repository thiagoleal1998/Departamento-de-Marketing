-- =====================================================================
-- 0027 — Novos status de tarefa (colunas do Notion)
-- ATENÇÃO: rode este arquivo SOZINHO e ANTES do 0028 (o Postgres exige
-- que valores novos de enum sejam confirmados antes de serem usados).
-- =====================================================================

alter type tarefa_status add value if not exists 'alteracoes';
alter type tarefa_status add value if not exists 'aprovacao_gustavo';
alter type tarefa_status add value if not exists 'aprovacao_thiago';
alter type tarefa_status add value if not exists 'aprovacao_marco';
