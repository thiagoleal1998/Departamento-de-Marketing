-- =====================================================================
-- 0064 — Operacional › Divulgação diária (planilha de ofertas do dia).
-- Nacional: produto, temporada, vantagem, aéreo, período da viagem.
-- Internacional: tipo de divulgação, destino, descritivo e concorrência.
-- Todos do time veem e editam; só a liderança exclui. Pode rodar mais de uma vez.
-- =====================================================================

create table if not exists divulgacao_ofertas (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  tipo text not null check (tipo in ('nacional', 'internacional')),
  canal text,                    -- tipo de divulgação (e-mail técnico, lâmina...), no internacional
  produto text,                  -- produtos (nacional) ou destinos (internacional)
  temporada text,
  vantagem text,                 -- vantagem (nacional) ou descritivo (internacional)
  aereo text,
  periodo_viagem text,
  oferta_dia text,
  conc_lv numeric(12,2),         -- preço Litoral Verde
  conc_concorrente numeric(12,2),-- preço Booking/Decolar
  conc_diferenca numeric(12,2),
  observacao text,
  aba_origem text,               -- aba da planilha de onde veio (importação)
  linha_origem integer,
  criado_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reimportar a planilha atualiza as mesmas linhas em vez de duplicar.
create unique index if not exists divulgacao_ofertas_origem_uk
  on divulgacao_ofertas (aba_origem, linha_origem);
create index if not exists divulgacao_ofertas_data_idx on divulgacao_ofertas (data desc);
create index if not exists divulgacao_ofertas_tipo_idx on divulgacao_ofertas (tipo, data desc);

create table if not exists divulgacao_condicoes (
  id uuid primary key default gen_random_uuid(),
  hotel text not null,
  periodo_venda text,
  periodo_viagem text,
  condicao text,
  linha_origem integer unique,
  criado_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table divulgacao_ofertas enable row level security;
alter table divulgacao_condicoes enable row level security;

drop policy if exists "divulgacao_ofertas_select" on divulgacao_ofertas;
create policy "divulgacao_ofertas_select" on divulgacao_ofertas for select using (auth.uid() is not null);
drop policy if exists "divulgacao_ofertas_insert" on divulgacao_ofertas;
create policy "divulgacao_ofertas_insert" on divulgacao_ofertas for insert with check (auth.uid() is not null);
drop policy if exists "divulgacao_ofertas_update" on divulgacao_ofertas;
create policy "divulgacao_ofertas_update" on divulgacao_ofertas for update using (auth.uid() is not null) with check (auth.uid() is not null);
drop policy if exists "divulgacao_ofertas_delete" on divulgacao_ofertas;
create policy "divulgacao_ofertas_delete" on divulgacao_ofertas for delete using (public.eh_lideranca());

drop policy if exists "divulgacao_condicoes_select" on divulgacao_condicoes;
create policy "divulgacao_condicoes_select" on divulgacao_condicoes for select using (auth.uid() is not null);
drop policy if exists "divulgacao_condicoes_insert" on divulgacao_condicoes;
create policy "divulgacao_condicoes_insert" on divulgacao_condicoes for insert with check (auth.uid() is not null);
drop policy if exists "divulgacao_condicoes_update" on divulgacao_condicoes;
create policy "divulgacao_condicoes_update" on divulgacao_condicoes for update using (auth.uid() is not null) with check (auth.uid() is not null);
drop policy if exists "divulgacao_condicoes_delete" on divulgacao_condicoes;
create policy "divulgacao_condicoes_delete" on divulgacao_condicoes for delete using (public.eh_lideranca());
