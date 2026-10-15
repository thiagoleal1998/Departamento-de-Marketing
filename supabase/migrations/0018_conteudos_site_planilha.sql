-- =====================================================================
-- 0018 — Conteúdos do site: campos da planilha "Conteúdos site"
-- Rode DEPOIS da 0014 e ANTES da 0019 (importação).
-- =====================================================================

alter table conteudos_site add column if not exists categoria text;
alter table conteudos_site add column if not exists estrelas text;
alter table conteudos_site add column if not exists abrangencia text;

create index if not exists conteudos_site_categoria_idx on conteudos_site (categoria);
