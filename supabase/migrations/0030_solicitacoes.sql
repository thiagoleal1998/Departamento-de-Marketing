-- =====================================================================
-- 0030 — Solicitações (folga, férias, saída mais cedo etc.)
-- Cada pessoa vê as próprias; liderança vê todas; só o gerente decide.
-- Rode DEPOIS das anteriores.
-- =====================================================================

create table if not exists solicitacoes (
  id uuid primary key default gen_random_uuid(),
  solicitante_id uuid not null references profiles(id) on delete cascade,
  tipo text not null check (tipo in (
    'folga', 'ferias', 'saida_cedo', 'entrada_tarde',
    'home_office', 'consulta', 'banco_horas', 'atestado', 'outro'
  )),
  data_inicio date not null,
  data_fim date,
  hora text,
  motivo text,
  status text not null default 'pendente'
    check (status in ('pendente', 'aprovada', 'recusada', 'cancelada')),
  resposta text,
  decidido_por uuid references profiles(id) on delete set null,
  decidido_em timestamptz,
  created_at timestamptz not null default now(),
  check (data_fim is null or data_fim >= data_inicio)
);
create index if not exists solicitacoes_solicitante_idx
  on solicitacoes (solicitante_id, created_at desc);
create index if not exists solicitacoes_status_idx on solicitacoes (status);

alter table solicitacoes enable row level security;

drop policy if exists "solic_select" on solicitacoes;
create policy "solic_select" on solicitacoes for select
  using (solicitante_id = auth.uid() or public.eh_lideranca());

drop policy if exists "solic_insert" on solicitacoes;
create policy "solic_insert" on solicitacoes for insert
  with check (solicitante_id = auth.uid() and status = 'pendente');

-- O solicitante só pode cancelar a própria solicitação ainda pendente.
drop policy if exists "solic_update_proprio" on solicitacoes;
create policy "solic_update_proprio" on solicitacoes for update
  using (solicitante_id = auth.uid() and status = 'pendente')
  with check (solicitante_id = auth.uid() and status in ('pendente', 'cancelada'));

-- O gerente decide (aprova/recusa) qualquer solicitação.
drop policy if exists "solic_update_gerente" on solicitacoes;
create policy "solic_update_gerente" on solicitacoes for update
  using (public.eh_gerente()) with check (public.eh_gerente());
