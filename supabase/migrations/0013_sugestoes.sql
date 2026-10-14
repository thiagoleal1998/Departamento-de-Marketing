-- =====================================================================
-- 0013 — Sugestões e ideias (relatos de problemas, ideias, elogios)
-- Rode DEPOIS das anteriores.
-- =====================================================================

create table if not exists sugestoes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'ideia' check (tipo in ('ideia', 'problema', 'elogio')),
  titulo text not null,
  descricao text not null,
  status text not null default 'nova'
    check (status in ('nova', 'em_analise', 'planejada', 'concluida', 'descartada')),
  resposta text,
  respondido_por uuid references profiles(id) on delete set null,
  autor_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sugestoes_autor_idx on sugestoes (autor_id, created_at desc);

alter table sugestoes enable row level security;

-- Cada pessoa vê as próprias; liderança vê todas.
drop policy if exists "sugestoes_select" on sugestoes;
create policy "sugestoes_select" on sugestoes for select
  using (autor_id = auth.uid() or public.eh_lideranca());

drop policy if exists "sugestoes_insert" on sugestoes;
create policy "sugestoes_insert" on sugestoes for insert
  with check (autor_id = auth.uid() and status = 'nova' and resposta is null);

-- Somente gerente altera status/resposta ou exclui.
drop policy if exists "sugestoes_update" on sugestoes;
create policy "sugestoes_update" on sugestoes for update
  using (public.eh_gerente()) with check (public.eh_gerente());

drop policy if exists "sugestoes_delete" on sugestoes;
create policy "sugestoes_delete" on sugestoes for delete
  using (public.eh_gerente());
