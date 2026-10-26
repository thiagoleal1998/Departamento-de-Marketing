-- =====================================================================
-- 0068 — Escala de feriados: avisos ao time e visão do colaborador.
-- O colaborador vê a própria escala, os feriados extras e se o time já foi
-- avisado (folga). Montar a escala continua só com gerente e líder.
-- Rode DEPOIS da 0067. Pode rodar mais de uma vez.
-- =====================================================================

create table if not exists escala_avisos (
  data date primary key,
  avisado_em timestamptz not null default now(),
  avisado_por uuid references profiles(id) on delete set null
);

alter table escala_avisos enable row level security;

drop policy if exists "escala_avisos_select" on escala_avisos;
create policy "escala_avisos_select" on escala_avisos for select using (auth.uid() is not null);

drop policy if exists "escala_avisos_escrita" on escala_avisos;
create policy "escala_avisos_escrita" on escala_avisos
  for all using (public.eh_lideranca()) with check (public.eh_lideranca());

-- Cada pessoa enxerga as próprias escalas.
drop policy if exists "escala_feriados_propria" on escala_feriados;
create policy "escala_feriados_propria" on escala_feriados for select using (profile_id = auth.uid());

-- Feriados extras (municipais, pontes) são informação de todos.
drop policy if exists "feriados_extras_leitura" on feriados_extras;
create policy "feriados_extras_leitura" on feriados_extras for select using (auth.uid() is not null);
