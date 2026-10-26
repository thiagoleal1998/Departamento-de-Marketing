-- =====================================================================
-- 0071 — Segundo link na tarefa: o link do nosso site (o campo "link" que já
-- existia passa a ser a URL de referência). Pode rodar mais de uma vez.
-- =====================================================================

alter table tarefas add column if not exists link_site text;
