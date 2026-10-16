-- =====================================================================
-- 0034 — Adiciona a categoria "Feira" aos projetos.
-- Rode DEPOIS da 0033. Pode rodar mais de uma vez.
-- =====================================================================

alter table projetos drop constraint if exists projetos_categoria_check;
alter table projetos add constraint projetos_categoria_check
  check (categoria in ('eventos', 'feiras', 'famtour', 'projetos_marketing', 'vts'));
