-- =====================================================================
-- 0043 — Aba Comercial: espelho da planilha "Condições e Disponibilidades".
-- Cada aba da planilha vira um registro (células, cores e mesclagens).
-- A sincronização roda no servidor (service role): ao editar a planilha
-- (Apps Script), todos os dias (agendador) e pelo botão "Sincronizar agora".
-- Leitura: todos os usuários autenticados. Escrita: só o servidor.
-- Rode DEPOIS das anteriores. Pode rodar mais de uma vez.
-- =====================================================================

create table if not exists comercial_abas (
  nome text primary key,
  ordem int not null default 0,
  dados jsonb not null,
  hash text not null,
  atualizado_em timestamptz not null default now()
);

create table if not exists comercial_sync (
  id int primary key default 1 check (id = 1),
  sincronizado_em timestamptz,
  origem text,
  abas int,
  alteradas int,
  erro text
);
insert into comercial_sync (id) values (1) on conflict (id) do nothing;

alter table comercial_abas enable row level security;
alter table comercial_sync enable row level security;

drop policy if exists "comercial_abas_select" on comercial_abas;
create policy "comercial_abas_select" on comercial_abas
  for select using (auth.uid() is not null);
drop policy if exists "comercial_sync_select" on comercial_sync;
create policy "comercial_sync_select" on comercial_sync
  for select using (auth.uid() is not null);
-- Sem policies de escrita: apenas o servidor (service role) grava.
