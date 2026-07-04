-- =====================================================================
-- 0011 — Etapas no kanban (sync) + Documentos e Comparativos do projeto
-- Rode DEPOIS de 0010.
-- =====================================================================

-- Etapa de projeto vira card no kanban (tarefa vinculada).
alter table tarefas add column if not exists etapa_id uuid
  references projeto_etapas(id) on delete cascade;

-- Documentos do projeto
create table if not exists projeto_documentos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,
  nome text not null,
  url text not null,
  created_at timestamptz not null default now()
);

-- Comparativos de custo (stand, brindes, etc.)
create table if not exists projeto_comparativos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,
  item text not null,
  fornecedor text not null,
  valor numeric(12,2),
  observacao text,
  created_at timestamptz not null default now()
);

alter table projeto_documentos enable row level security;
alter table projeto_comparativos enable row level security;

drop policy if exists "docs_select" on projeto_documentos;
create policy "docs_select" on projeto_documentos for select using (auth.uid() is not null);
drop policy if exists "docs_write" on projeto_documentos;
create policy "docs_write" on projeto_documentos for all
  using (public.eh_lideranca()) with check (public.eh_lideranca());

drop policy if exists "comp_select" on projeto_comparativos;
create policy "comp_select" on projeto_comparativos for select using (auth.uid() is not null);
drop policy if exists "comp_write" on projeto_comparativos;
create policy "comp_write" on projeto_comparativos for all
  using (public.eh_lideranca()) with check (public.eh_lideranca());
