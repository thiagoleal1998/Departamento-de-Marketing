-- =====================================================================
-- 0089 — Escala de feriados: modalidade de cada escalado (presencial ou home office).
-- Quem já estava escalado fica como "presencial". Pode rodar mais de uma vez.
-- =====================================================================

alter table escala_feriados
  add column if not exists modalidade text not null default 'presencial'
  check (modalidade in ('presencial', 'home_office'));
