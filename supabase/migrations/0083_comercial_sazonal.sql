-- =====================================================================
-- 0083 — Comercial: períodos sazonais (ex.: Black November 2026).
-- Uma planilha por período, lida pelo servidor: um registro por hotel, com
-- status da campanha, condição, período de vendas/hospedagens e observações.
-- Guarda também o valor anterior de quem mudou (para destacar nos cards).
-- Leitura: usuários autenticados. Escrita: só o servidor (service role).
-- Pode rodar mais de uma vez.
-- =====================================================================

create table if not exists comercial_sazonal (
  periodo text not null,             -- id do período (ex.: black-november-2026)
  chave text not null,               -- nome do hotel normalizado
  hotel text not null,
  ordem int not null default 0,
  status text not null default '',
  condicao text not null default '',
  vendas text not null default '',
  hospedagens text not null default '',
  observacao text not null default '',
  hash text not null,
  anterior jsonb,                    -- valores antes da última mudança (null = hotel novo)
  alterado_em timestamptz,           -- quando mudou pela última vez (null = nunca mudou)
  atualizado_em timestamptz not null default now(),
  primary key (periodo, chave)
);
create index if not exists comercial_sazonal_periodo_idx on comercial_sazonal (periodo, ordem);

create table if not exists comercial_sazonal_sync (
  periodo text primary key,
  sincronizado_em timestamptz,
  origem text,
  total int,
  erro text
);

alter table comercial_sazonal enable row level security;
alter table comercial_sazonal_sync enable row level security;

drop policy if exists "comercial_sazonal_select" on comercial_sazonal;
create policy "comercial_sazonal_select" on comercial_sazonal
  for select using (auth.uid() is not null);
drop policy if exists "comercial_sazonal_sync_select" on comercial_sazonal_sync;
create policy "comercial_sazonal_sync_select" on comercial_sazonal_sync
  for select using (auth.uid() is not null);
-- Sem policies de escrita: apenas o servidor (service role) grava.
