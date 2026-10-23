-- =====================================================================
-- 0065 — Divulgação diária: registro da última atualização a partir da
-- planilha (diária, às 10:30, ou manual). Pode rodar mais de uma vez.
-- =====================================================================

create table if not exists divulgacao_sync (
  id integer primary key default 1 check (id = 1),
  sincronizado_em timestamptz,
  origem text,
  "naPlanilha" integer,
  inseridas integer,
  atualizadas integer,
  removidas integer,
  preservadas integer,
  erro text
);

alter table divulgacao_sync enable row level security;
drop policy if exists "divulgacao_sync_select" on divulgacao_sync;
create policy "divulgacao_sync_select" on divulgacao_sync for select using (auth.uid() is not null);
