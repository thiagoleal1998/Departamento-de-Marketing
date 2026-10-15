-- =====================================================================
-- 0024 — Diretório da equipe (nome e cargo visíveis para todos)
-- Colaboradores só enxergam o próprio perfil (RLS). Esta função expõe
-- apenas id, nome e cargo dos usuários ativos — sem e-mail nem papel —
-- para o chat, comunicados e histórico do estoque.
-- Rode DEPOIS das anteriores.
-- =====================================================================

create or replace function public.diretorio_equipe()
returns table (id uuid, nome text, cargo text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.nome, p.cargo
  from profiles p
  where p.ativo
    and auth.uid() is not null
  order by p.nome;
$$;

grant execute on function public.diretorio_equipe() to authenticated;
