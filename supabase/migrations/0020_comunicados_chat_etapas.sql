-- =====================================================================
-- 0020 — Comunicados, Chat ao vivo e nomes das etapas do Feedback
-- Rode DEPOIS das anteriores (precisa da 0013 para as etapas).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Comunicados (mural): liderança publica, todos leem
-- ---------------------------------------------------------------------
create table if not exists comunicados (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  corpo text not null,
  fixado boolean not null default false,
  autor_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists comunicados_created_idx on comunicados (fixado desc, created_at desc);

alter table comunicados enable row level security;

drop policy if exists "comunicados_select" on comunicados;
create policy "comunicados_select" on comunicados
  for select using (auth.uid() is not null);
drop policy if exists "comunicados_write" on comunicados;
create policy "comunicados_write" on comunicados for all
  using (public.eh_lideranca()) with check (public.eh_lideranca());

-- ---------------------------------------------------------------------
-- Chat: sala geral + conversas diretas
-- ---------------------------------------------------------------------
create table if not exists chat_conversas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('geral', 'direta')),
  created_at timestamptz not null default now()
);

-- Sala geral única, com id fixo.
insert into chat_conversas (id, tipo)
values ('00000000-0000-0000-0000-00000000c0de', 'geral')
on conflict (id) do nothing;

create table if not exists chat_membros (
  conversa_id uuid not null references chat_conversas(id) on delete cascade,
  usuario_id uuid not null references profiles(id) on delete cascade,
  ultima_leitura timestamptz not null default now(),
  primary key (conversa_id, usuario_id)
);

create table if not exists chat_mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references chat_conversas(id) on delete cascade,
  autor_id uuid not null references profiles(id) on delete cascade,
  texto text not null check (length(trim(texto)) > 0 and length(texto) <= 2000),
  created_at timestamptz not null default now()
);
create index if not exists chat_msg_conversa_idx on chat_mensagens (conversa_id, created_at);

alter table chat_conversas enable row level security;
alter table chat_membros enable row level security;
alter table chat_mensagens enable row level security;

-- Função auxiliar (evita recursão de RLS): sou membro da conversa?
create or replace function public.chat_pode_acessar(p_conversa uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and (
      exists (select 1 from chat_conversas c where c.id = p_conversa and c.tipo = 'geral')
      or exists (
        select 1 from chat_membros m
        where m.conversa_id = p_conversa and m.usuario_id = auth.uid()
      )
    );
$$;

drop policy if exists "chat_conversas_select" on chat_conversas;
create policy "chat_conversas_select" on chat_conversas
  for select using (public.chat_pode_acessar(id));

drop policy if exists "chat_membros_select" on chat_membros;
create policy "chat_membros_select" on chat_membros
  for select using (public.chat_pode_acessar(conversa_id));
drop policy if exists "chat_membros_insert" on chat_membros;
create policy "chat_membros_insert" on chat_membros
  for insert with check (
    usuario_id = auth.uid()
    and exists (select 1 from chat_conversas c where c.id = conversa_id and c.tipo = 'geral')
  );
drop policy if exists "chat_membros_update" on chat_membros;
create policy "chat_membros_update" on chat_membros
  for update using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

drop policy if exists "chat_msg_select" on chat_mensagens;
create policy "chat_msg_select" on chat_mensagens
  for select using (public.chat_pode_acessar(conversa_id));
drop policy if exists "chat_msg_insert" on chat_mensagens;
create policy "chat_msg_insert" on chat_mensagens
  for insert with check (
    autor_id = auth.uid() and public.chat_pode_acessar(conversa_id)
  );

-- Abre (ou cria) a conversa direta entre eu e outra pessoa.
create or replace function public.chat_abrir_direta(p_outro uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_eu uuid := auth.uid();
  v_conversa uuid;
begin
  if v_eu is null then
    raise exception 'Sessão expirada.';
  end if;
  if p_outro is null or p_outro = v_eu then
    raise exception 'Escolha outra pessoa.';
  end if;
  if not exists (select 1 from profiles where id = p_outro and ativo) then
    raise exception 'Usuário não encontrado.';
  end if;

  select c.id into v_conversa
  from chat_conversas c
  where c.tipo = 'direta'
    and exists (select 1 from chat_membros m where m.conversa_id = c.id and m.usuario_id = v_eu)
    and exists (select 1 from chat_membros m where m.conversa_id = c.id and m.usuario_id = p_outro)
  limit 1;

  if v_conversa is null then
    insert into chat_conversas (tipo) values ('direta') returning id into v_conversa;
    insert into chat_membros (conversa_id, usuario_id) values (v_conversa, v_eu), (v_conversa, p_outro);
  end if;

  return v_conversa;
end;
$$;
grant execute on function public.chat_abrir_direta(uuid) to authenticated;

-- Mensagens não lidas por conversa (para o contador do menu).
create or replace function public.chat_nao_lidas()
returns table (conversa_id uuid, qtd bigint)
language sql
stable
as $$
  select m.conversa_id, count(*)::bigint
  from chat_mensagens m
  left join chat_membros cm
    on cm.conversa_id = m.conversa_id and cm.usuario_id = auth.uid()
  where m.autor_id <> auth.uid()
    and m.created_at > coalesce(
      cm.ultima_leitura,
      (select p.created_at from profiles p where p.id = auth.uid())
    )
  group by m.conversa_id;
$$;
grant execute on function public.chat_nao_lidas() to authenticated;

-- Tempo real nas mensagens.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'chat_mensagens'
  ) then
    alter publication supabase_realtime add table chat_mensagens;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Nomes das etapas do kanban do Feedback (editáveis pelo gerente)
-- ---------------------------------------------------------------------
create table if not exists sugestoes_etapas (
  status text primary key
    check (status in ('nova', 'em_analise', 'planejada', 'concluida', 'descartada')),
  nome text not null
);

insert into sugestoes_etapas (status, nome) values
  ('nova', 'Nova'),
  ('em_analise', 'Em análise'),
  ('planejada', 'Planejada'),
  ('concluida', 'Concluída'),
  ('descartada', 'Descartada')
on conflict (status) do nothing;

alter table sugestoes_etapas enable row level security;
drop policy if exists "sug_etapas_select" on sugestoes_etapas;
create policy "sug_etapas_select" on sugestoes_etapas
  for select using (auth.uid() is not null);
drop policy if exists "sug_etapas_write" on sugestoes_etapas;
create policy "sug_etapas_write" on sugestoes_etapas for all
  using (public.eh_gerente()) with check (public.eh_gerente());
