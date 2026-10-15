-- =====================================================================
-- 0029 — Tarefas: conteúdo interno do card (como a página do Notion)
-- Rode DEPOIS das anteriores.
-- =====================================================================

alter table tarefas add column if not exists conteudo text;
