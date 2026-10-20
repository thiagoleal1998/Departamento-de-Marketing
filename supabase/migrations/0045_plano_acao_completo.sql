-- =====================================================================
-- 0045 — Plano de ação completo: título, descrição editável, objetivos de
-- curto/médio/longo prazo, checklist, documentos (PDF/imagens/Office) e
-- relatório de proficiência com notas.
-- Os blocos ficam em colunas jsonb do próprio plano (as regras de acesso
-- de planos_acao continuam valendo). Bucket PRIVADO "planos-acao".
-- Rode DEPOIS da 0044. Pode rodar mais de uma vez.
-- =====================================================================

alter table planos_acao add column if not exists titulo text;
alter table planos_acao add column if not exists objetivos jsonb not null default '[]'::jsonb;
alter table planos_acao add column if not exists checklist jsonb not null default '[]'::jsonb;
alter table planos_acao add column if not exists anexos jsonb not null default '[]'::jsonb;
alter table planos_acao add column if not exists proficiencia jsonb not null default '[]'::jsonb;
alter table planos_acao add column if not exists updated_at timestamptz not null default now();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'planos-acao',
  'planos-acao',
  false,
  26214400, -- 25 MB por arquivo
  array[
    'application/pdf',
    'image/png', 'image/jpeg', 'image/gif', 'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = false;
