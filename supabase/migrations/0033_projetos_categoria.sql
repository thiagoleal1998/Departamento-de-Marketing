-- =====================================================================
-- 0033 — Categoria dos projetos (submenu: Eventos, Famtour,
-- Projetos de Marketing e VT's). Projetos existentes ficam em
-- "Projetos de Marketing". Pode rodar mais de uma vez.
-- =====================================================================

alter table projetos
  add column if not exists categoria text not null default 'projetos_marketing';

alter table projetos drop constraint if exists projetos_categoria_check;
alter table projetos add constraint projetos_categoria_check
  check (categoria in ('eventos', 'famtour', 'projetos_marketing', 'vts'));

create index if not exists projetos_categoria_idx on projetos (categoria);
