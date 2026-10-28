-- =====================================================================
-- 0082 — Chat: enviar imagem e áudio (mensagem de voz ou arquivo de áudio).
--  • chat_mensagens.anexo: { "tipo": "imagem"|"audio", "url": "...", "nome": "...", "duracao": 12 }
--  • bucket "chat-anexos" (público, endereço difícil de adivinhar), até 15 MB por arquivo.
-- Pode rodar mais de uma vez.
-- =====================================================================

alter table chat_mensagens add column if not exists anexo jsonb;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-anexos',
  'chat-anexos',
  true,
  15728640, -- 15 MB por arquivo
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/x-m4a', 'audio/m4a'
  ]
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = true;
