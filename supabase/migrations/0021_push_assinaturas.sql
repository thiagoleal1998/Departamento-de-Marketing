-- =====================================================================
-- 0021 — Notificações push do navegador (assinaturas)
-- Rode DEPOIS das anteriores.
-- =====================================================================

create table if not exists push_assinaturas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_assinaturas_usuario_idx on push_assinaturas (usuario_id);

alter table push_assinaturas enable row level security;

-- Cada pessoa vê e gerencia apenas as próprias assinaturas.
-- (O envio das notificações é feito pelo servidor com a service role.)
drop policy if exists "push_select" on push_assinaturas;
create policy "push_select" on push_assinaturas
  for select using (usuario_id = auth.uid());
drop policy if exists "push_insert" on push_assinaturas;
create policy "push_insert" on push_assinaturas
  for insert with check (usuario_id = auth.uid());
drop policy if exists "push_delete" on push_assinaturas;
create policy "push_delete" on push_assinaturas
  for delete using (usuario_id = auth.uid());
