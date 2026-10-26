-- =====================================================================
-- 0067 — Gestão › Escala de feriados: quem fica de plantão em cada feriado
-- e feriados extras (municipais, pontes). Só gerente e líder. Pode rodar mais de uma vez.
-- =====================================================================

create table if not exists escala_feriados (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  profile_id uuid not null references profiles(id) on delete cascade,
  observacao text,
  criado_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (data, profile_id)
);
create index if not exists escala_feriados_data_idx on escala_feriados (data);

create table if not exists feriados_extras (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  nome text not null,
  criado_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists feriados_extras_data_idx on feriados_extras (data);

alter table escala_feriados enable row level security;
alter table feriados_extras enable row level security;

drop policy if exists "escala_feriados_lideranca" on escala_feriados;
create policy "escala_feriados_lideranca" on escala_feriados
  for all using (public.eh_lideranca()) with check (public.eh_lideranca());

drop policy if exists "feriados_extras_lideranca" on feriados_extras;
create policy "feriados_extras_lideranca" on feriados_extras
  for all using (public.eh_lideranca()) with check (public.eh_lideranca());
