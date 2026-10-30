-- Contato opcional, editável pelo próprio usuário e pelos gerentes via RLS existente.
alter table public.profiles
  add column if not exists whatsapp text
  check (whatsapp is null or whatsapp ~ '^[0-9]{10,15}$');

comment on column public.profiles.whatsapp is 'WhatsApp com DDD/DDI, somente dígitos; opcional.';
