-- =====================================================================
-- 0044 — Comercial: um registro por produto (hotel) + histórico de mudanças.
-- A sincronização lê a planilha, separa os produtos, compara com a leitura
-- anterior e grava o que mudou (para destacar nos cards e avisar a equipe).
-- Leitura: todos os usuários autenticados. Escrita: só o servidor.
-- Rode DEPOIS da 0043. Pode rodar mais de uma vez.
-- =====================================================================

create table if not exists comercial_produtos (
  chave text primary key,            -- aba | nome normalizado
  secao text not null,               -- nome da aba da planilha
  nome text not null,
  ordem int not null default 0,
  tag text,                          -- marcação pela cor do nome (legenda)
  tag_cor text,
  campos jsonb not null default '[]'::jsonb,
  hash text not null,
  atualizado_em timestamptz not null default now()
);
create index if not exists comercial_produtos_secao_idx on comercial_produtos (secao, ordem);

create table if not exists comercial_alteracoes (
  id uuid primary key default gen_random_uuid(),
  chave text not null,
  secao text not null,
  nome text not null,
  tipo text not null check (tipo in ('novo', 'alterado', 'removido')),
  mudancas jsonb not null default '[]'::jsonb,
  detectado_em timestamptz not null default now()
);
create index if not exists comercial_alteracoes_data_idx on comercial_alteracoes (detectado_em desc);
create index if not exists comercial_alteracoes_chave_idx on comercial_alteracoes (chave, detectado_em desc);

alter table comercial_produtos enable row level security;
alter table comercial_alteracoes enable row level security;

drop policy if exists "comercial_produtos_select" on comercial_produtos;
create policy "comercial_produtos_select" on comercial_produtos
  for select using (auth.uid() is not null);
drop policy if exists "comercial_alteracoes_select" on comercial_alteracoes;
create policy "comercial_alteracoes_select" on comercial_alteracoes
  for select using (auth.uid() is not null);
-- Sem policies de escrita: apenas o servidor (service role) grava.

-- A tabela antiga (espelho da grade) não é mais usada.
drop table if exists comercial_abas;
