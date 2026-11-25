-- =====================================================================
-- 0091 — Folgas: data de retorno ao trabalho (Gestão › Folgas).
-- Rode DEPOIS da 0090. Pode rodar mais de uma vez.
-- =====================================================================

alter table folgas add column if not exists retorno date;
