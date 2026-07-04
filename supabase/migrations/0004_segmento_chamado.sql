-- =====================================================================
-- 0004 — Segmento / público-alvo nos chamados
-- Rode DEPOIS de 0001, 0002 e 0003.
-- =====================================================================

alter table chamados add column if not exists segmento text;
