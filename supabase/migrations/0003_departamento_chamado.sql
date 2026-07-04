-- =====================================================================
-- 0003 — Departamento solicitante nos chamados
-- Rode DEPOIS de 0001 e 0002.
-- =====================================================================

alter table chamados add column if not exists departamento text;
