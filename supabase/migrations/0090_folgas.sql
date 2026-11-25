-- =====================================================================
-- 0090 — Folgas (Gestão › Folgas): folga TRE, compensação, abono etc.
-- A justificativa e as autorizações só a liderança e a própria pessoa enxergam;
-- o time é avisado por notificação (sem justificativa) e vê só a ausência.
-- Pode rodar mais de uma vez.
-- =====================================================================

create table if not exists folgas (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  tipo text not null default 'tre',
  inicio date not null,
  fim date not null,
  justificativa text,
  -- [{ "funcao": "Supervisão", "profile_id": "<uuid>" }, ...]
  autorizacoes jsonb not null default '[]'::jsonb,
  equipe_avisada_em timestamptz,
  equipe_avisada_por uuid references profiles(id) on delete set null,
  criado_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (fim >= inicio)
);

create index if not exists folgas_profile_idx on folgas (profile_id, inicio);
create index if not exists folgas_inicio_idx on folgas (inicio);

alter table folgas enable row level security;

drop policy if exists "folgas_select" on folgas;
create policy "folgas_select" on folgas for select using (public.eh_lideranca() or profile_id = auth.uid());

drop policy if exists "folgas_insert" on folgas;
create policy "folgas_insert" on folgas for insert with check (public.eh_lideranca());

drop policy if exists "folgas_update" on folgas;
create policy "folgas_update" on folgas for update using (public.eh_lideranca()) with check (public.eh_lideranca());

drop policy if exists "folgas_delete" on folgas;
create policy "folgas_delete" on folgas for delete using (public.eh_lideranca());
