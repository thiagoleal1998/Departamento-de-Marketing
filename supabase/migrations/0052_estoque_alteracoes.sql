-- =====================================================================
-- 0052 — Estoque: registro das alterações de cadastro (troca de nome e do
-- estoque mínimo), com quem alterou, quando, valor anterior e novo.
-- Leitura: todos autenticados. Escrita: gerente (mesma regra de editar itens).
-- Rode DEPOIS da 0051. Pode rodar mais de uma vez.
-- =====================================================================

create table if not exists estoque_alteracoes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references estoque_itens(id) on delete set null,
  campo text not null check (campo in ('nome', 'estoque_minimo')),
  valor_anterior text,
  valor_novo text,
  usuario_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists estoque_alteracoes_item_idx on estoque_alteracoes (item_id, created_at desc);
create index if not exists estoque_alteracoes_data_idx on estoque_alteracoes (created_at desc);

alter table estoque_alteracoes enable row level security;

drop policy if exists "estoque_alt_select" on estoque_alteracoes;
create policy "estoque_alt_select" on estoque_alteracoes
  for select using (auth.uid() is not null);
drop policy if exists "estoque_alt_insert" on estoque_alteracoes;
create policy "estoque_alt_insert" on estoque_alteracoes
  for insert with check (public.eh_gerente() and usuario_id = auth.uid());
-- Sem update/delete: o registro é permanente.
