-- =====================================================================
-- 0035 — Anexos (imagens e vídeos) nos envios de Feedback.
-- Bucket PRIVADO "feedback-midias" (links assinados gerados no servidor).
-- Rode DEPOIS da 0013. Pode rodar mais de uma vez.
-- =====================================================================

alter table sugestoes
  add column if not exists anexos jsonb not null default '[]'::jsonb;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'feedback-midias',
  'feedback-midias',
  false,
  52428800, -- 50 MB por arquivo
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp',
        'video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = false;
