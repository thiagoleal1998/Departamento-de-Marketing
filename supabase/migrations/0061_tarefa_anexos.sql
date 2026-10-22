-- =====================================================================
-- 0061 — Anexos nos cards de tarefas (fotos e documentos).
-- Quem enxerga o card (liderança ou responsável) vê, anexa e remove os
-- próprios anexos; a liderança remove qualquer um. Pode rodar mais de uma vez.
-- =====================================================================

create table if not exists tarefa_anexos (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references tarefas(id) on delete cascade,
  caminho text not null,
  nome text not null,
  tipo text,
  tamanho bigint,
  criado_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists tarefa_anexos_tarefa_idx on tarefa_anexos (tarefa_id, created_at desc);

alter table tarefa_anexos enable row level security;

-- A subconsulta em tarefas já respeita a regra de quem vê o card.
drop policy if exists "tarefa_anexos_select" on tarefa_anexos;
create policy "tarefa_anexos_select" on tarefa_anexos
  for select using (exists (select 1 from tarefas t where t.id = tarefa_id));

drop policy if exists "tarefa_anexos_insert" on tarefa_anexos;
create policy "tarefa_anexos_insert" on tarefa_anexos
  for insert with check (
    criado_por = auth.uid()
    and exists (select 1 from tarefas t where t.id = tarefa_id)
  );

drop policy if exists "tarefa_anexos_delete" on tarefa_anexos;
create policy "tarefa_anexos_delete" on tarefa_anexos
  for delete using (criado_por = auth.uid() or public.eh_lideranca());

-- Arquivos num bucket privado (links temporários gerados pelo servidor).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tarefa-anexos',
  'tarefa-anexos',
  false,
  20971520, -- 20 MB por arquivo
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv',
    'application/zip', 'application/x-zip-compressed'
  ]
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = false;
