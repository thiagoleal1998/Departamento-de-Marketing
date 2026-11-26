-- 0093 — Setores do departamento (página inicial): o que cada um faz, quem está nele e o que cada pessoa faz
create table if not exists setores (
  id text primary key,
  nome text not null,
  descricao text not null default '',
  membros jsonb not null default '[]'::jsonb, -- [{ "profile_id": "...", "funcao": "..." }]
  ordem int not null default 0,
  updated_at timestamptz not null default now()
);

alter table setores enable row level security;

drop policy if exists "setores_select" on setores;
create policy "setores_select" on setores for select using (auth.uid() is not null);

drop policy if exists "setores_write" on setores;
create policy "setores_write" on setores for all
  using (public.eh_gerente()) with check (public.eh_gerente());

insert into setores (id, nome, ordem) values
  ('operacional', 'Operacional', 1),
  ('criacao', 'Criação', 2),
  ('midias-digitais', 'Mídias Digitais', 3)
on conflict (id) do nothing;
