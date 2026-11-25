-- 0092 — Histórico das pesquisas DISC de cada pessoa (comparativo de evolução entre pesquisas)
create table if not exists perfis_historico (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references perfis_comportamentais(id) on delete cascade,
  participante_id text not null,
  pesquisa text,
  concluido_em date,
  perfil_primario text not null check (perfil_primario in ('D','I','S','C')),
  perfil_secundario text check (perfil_secundario in ('D','I','S','C')),
  pontuacoes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (perfil_id, participante_id)
);

alter table perfis_historico enable row level security;

-- Quem enxerga o perfil enxerga o histórico dele (a RLS do perfil vale dentro do exists).
drop policy if exists "perfis_hist_select" on perfis_historico;
create policy "perfis_hist_select" on perfis_historico
  for select using (exists (select 1 from perfis_comportamentais p where p.id = perfil_id));

drop policy if exists "perfis_hist_write" on perfis_historico;
create policy "perfis_hist_write" on perfis_historico for all
  using (public.eh_gerente()) with check (public.eh_gerente());
