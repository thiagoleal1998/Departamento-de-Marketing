-- =====================================================================
-- 0002 — Configuração visual (branding) + Portal público de chamados
-- Rode DEPOIS de 0001_init.sql (e do seed, se já aplicado).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Configuração do sistema (linha única / singleton)
-- ---------------------------------------------------------------------
create table if not exists config_sistema (
  id boolean primary key default true,
  cor_primaria text not null default '#4f46e5',
  textos jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint config_singleton check (id)
);

insert into config_sistema (id) values (true) on conflict (id) do nothing;

alter table config_sistema enable row level security;

-- Leitura pública (login e portal precisam da marca antes de autenticar).
drop policy if exists "config_read" on config_sistema;
create policy "config_read" on config_sistema for select using (true);

-- Escrita apenas para gerente.
drop policy if exists "config_write" on config_sistema;
create policy "config_write" on config_sistema for all
  using (public.eh_gerente()) with check (public.eh_gerente());

-- ---------------------------------------------------------------------
-- Chamados: suporte a submissões públicas (portal)
-- ---------------------------------------------------------------------
alter table chamados alter column solicitante_id drop not null;
alter table chamados add column if not exists solicitante_nome text;
alter table chamados add column if not exists solicitante_email text;
alter table chamados add column if not exists origem text not null default 'interno';

-- Atualiza a policy de leitura para que a liderança enxergue também os
-- chamados abertos pelo portal (que não têm área nem solicitante interno).
drop policy if exists "chamados_select" on chamados;
create policy "chamados_select" on chamados for select using (
  public.eh_gerente()
  or solicitante_id = auth.uid()
  or responsavel_id = auth.uid()
  or (public.meu_papel() = 'lider' and area_id is not distinct from public.minha_area())
  or (origem = 'portal' and public.eh_lideranca())
);
