-- =====================================================================
-- 0057 — Histórico de modificações das Landing Pages.
-- Cada criação, edição (campo a campo: de → para) e exclusão fica registrada.
-- Pode rodar mais de uma vez.
-- =====================================================================

create table if not exists landing_pages_historico (
  id uuid primary key default gen_random_uuid(),
  landing_page_id uuid references landing_pages(id) on delete set null,
  lp_nome text not null,
  acao text not null check (acao in ('criada', 'alterada', 'excluida')),
  -- [{ "campo": "status_patrocinio", "rotulo": "Status de patrocínio", "de": "Ativo", "para": "Inativo" }]
  alteracoes jsonb not null default '[]'::jsonb,
  autor_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists landing_pages_historico_lp_idx on landing_pages_historico (landing_page_id, created_at desc);
create index if not exists landing_pages_historico_data_idx on landing_pages_historico (created_at desc);

alter table landing_pages_historico enable row level security;

drop policy if exists "lp_historico_select" on landing_pages_historico;
create policy "lp_historico_select" on landing_pages_historico
  for select using (auth.uid() is not null);

drop policy if exists "lp_historico_insert" on landing_pages_historico;
create policy "lp_historico_insert" on landing_pages_historico
  for insert with check (auth.uid() is not null and autor_id = auth.uid());
