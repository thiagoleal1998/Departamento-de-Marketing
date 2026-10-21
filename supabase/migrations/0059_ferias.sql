-- =====================================================================
-- 0059 — Férias dos colaboradores (Gestão › Férias).
-- Visível e editável só pela liderança. Pode rodar mais de uma vez.
-- =====================================================================

create table if not exists ferias (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  inicio date not null,
  fim date not null,
  observacao text,
  criado_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (fim >= inicio)
);

create index if not exists ferias_profile_idx on ferias (profile_id, inicio);
create index if not exists ferias_inicio_idx on ferias (inicio);

alter table ferias enable row level security;

drop policy if exists "ferias_select" on ferias;
create policy "ferias_select" on ferias for select using (public.eh_lideranca());

drop policy if exists "ferias_insert" on ferias;
create policy "ferias_insert" on ferias for insert with check (public.eh_lideranca());

drop policy if exists "ferias_update" on ferias;
create policy "ferias_update" on ferias for update using (public.eh_lideranca()) with check (public.eh_lideranca());

drop policy if exists "ferias_delete" on ferias;
create policy "ferias_delete" on ferias for delete using (public.eh_lideranca());
