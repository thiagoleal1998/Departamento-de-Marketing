-- =====================================================================
-- 0010 — Projetos maiores (ex.: eventos) com várias etapas
-- Rode DEPOIS das anteriores.
-- =====================================================================

create table if not exists projetos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  responsavel_id uuid references profiles(id) on delete set null,
  status text not null default 'planejamento', -- planejamento|em_andamento|concluido|cancelado
  data_inicio date,
  data_fim date,
  criado_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists projeto_etapas (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,
  titulo text not null,
  descricao text,
  status text not null default 'a_fazer', -- a_fazer|em_andamento|concluida
  responsavel_id uuid references profiles(id) on delete set null,
  prazo date,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists projeto_etapas_projeto_idx on projeto_etapas (projeto_id);

alter table projetos enable row level security;
alter table projeto_etapas enable row level security;

-- Todos autenticados veem; liderança cria/edita.
drop policy if exists "projetos_select" on projetos;
create policy "projetos_select" on projetos for select using (auth.uid() is not null);
drop policy if exists "projetos_write" on projetos;
create policy "projetos_write" on projetos for all
  using (public.eh_lideranca()) with check (public.eh_lideranca());

drop policy if exists "etapas_select" on projeto_etapas;
create policy "etapas_select" on projeto_etapas for select using (auth.uid() is not null);
drop policy if exists "etapas_write" on projeto_etapas;
create policy "etapas_write" on projeto_etapas for all
  using (public.eh_lideranca()) with check (public.eh_lideranca());
