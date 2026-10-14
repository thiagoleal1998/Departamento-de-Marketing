-- =====================================================================
-- 0015 — Landing pages: campos da planilha "Lista de Lp´s"
-- Rode DEPOIS da 0014 e ANTES da 0016 (importação).
-- =====================================================================

alter table landing_pages add column if not exists grupo text not null default 'novas';
alter table landing_pages add column if not exists tipo_pagina text not null default 'produto';
alter table landing_pages add column if not exists status_patrocinio text;
alter table landing_pages add column if not exists destino text;
alter table landing_pages add column if not exists continente text;
alter table landing_pages add column if not exists pais text;
alter table landing_pages add column if not exists regiao text;
alter table landing_pages add column if not exists estado text;
alter table landing_pages add column if not exists cidade text;
alter table landing_pages add column if not exists dominio text;
alter table landing_pages add column if not exists codigo_reduzido text;
alter table landing_pages add column if not exists codigo_feriado text;
alter table landing_pages add column if not exists banner_obrigatorio text;
alter table landing_pages add column if not exists tem_link_casamento text;
alter table landing_pages add column if not exists link_casamento text;
alter table landing_pages add column if not exists canal text;
alter table landing_pages add column if not exists tag_adm_mkt text;
alter table landing_pages add column if not exists banner_no_ar text;

create index if not exists landing_pages_grupo_idx on landing_pages (grupo);
