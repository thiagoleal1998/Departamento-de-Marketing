-- =====================================================================
-- 0086 — Tarefas: solicitante (quem pediu a tarefa), escolhido numa lista com os nomes do organograma.
-- Pode rodar mais de uma vez.
-- =====================================================================

alter table tarefas add column if not exists solicitante text;
