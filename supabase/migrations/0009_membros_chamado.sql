-- =====================================================================
-- 0009 — Membros adicionais no chamado
-- Gerente/líder podem incluir mais pessoas no chamado; membros passam a
-- enxergar o chamado. Rode DEPOIS das anteriores.
-- =====================================================================

create table if not exists chamado_membros (
  chamado_id uuid not null references chamados(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (chamado_id, profile_id)
);

alter table chamado_membros enable row level security;

-- Leitura simples para autenticados (evita recursão de RLS com chamados).
drop policy if exists "membros_select" on chamado_membros;
create policy "membros_select" on chamado_membros for select
  using (auth.uid() is not null);

-- Incluir/remover membros: apenas liderança.
drop policy if exists "membros_insert" on chamado_membros;
create policy "membros_insert" on chamado_membros for insert
  with check (public.eh_lideranca());
drop policy if exists "membros_delete" on chamado_membros;
create policy "membros_delete" on chamado_membros for delete
  using (public.eh_lideranca());

-- Função SECURITY DEFINER: evita recursão ao checar membership nas policies.
create or replace function public.eh_membro(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from chamado_membros
    where chamado_id = cid and profile_id = auth.uid()
  );
$$;

-- Membros também enxergam o chamado.
drop policy if exists "chamados_select" on chamados;
create policy "chamados_select" on chamados for select using (
  public.eh_gerente()
  or solicitante_id = auth.uid()
  or responsavel_id = auth.uid()
  or (public.meu_papel() = 'lider' and area_id is not distinct from public.minha_area())
  or (origem = 'portal' and public.eh_lideranca())
  or public.eh_membro(id)
);
