-- =====================================================================
-- Painel do Departamento de Marketing — Schema inicial
-- Ordem de aplicação: rode este arquivo inteiro no SQL Editor do Supabase.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Extensões
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Tipos (enums)
-- ---------------------------------------------------------------------
create type papel as enum ('gerente', 'lider', 'colaborador');
create type chamado_status as enum ('aberto', 'em_triagem', 'em_andamento', 'aguardando', 'resolvido', 'fechado');
create type chamado_prioridade as enum ('baixa', 'media', 'alta', 'urgente');
create type chamado_tipo as enum ('criacao_peca', 'revisao', 'aprovacao', 'suporte', 'outro');
create type tarefa_status as enum ('a_fazer', 'em_andamento', 'revisao', 'concluida');
create type feedback_status as enum ('rascunho', 'realizado');
create type plano_status as enum ('aberto', 'em_andamento', 'concluido');
create type plano_origem as enum ('feedback', 'um_a_um');

-- ---------------------------------------------------------------------
-- Tabelas — núcleo / pessoas
-- ---------------------------------------------------------------------
create table areas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  lider_id uuid,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  email text not null default '',
  role papel not null default 'colaborador',
  area_id uuid references areas(id) on delete set null,
  lider_id uuid references profiles(id) on delete set null,
  cargo text,
  avatar_url text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table areas
  add constraint areas_lider_fk foreign key (lider_id) references profiles(id) on delete set null;

-- ---------------------------------------------------------------------
-- Funções auxiliares (SECURITY DEFINER evita recursão nas policies)
-- ---------------------------------------------------------------------
create or replace function public.meu_papel()
returns papel language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function public.minha_area()
returns uuid language sql stable security definer set search_path = public as $$
  select area_id from profiles where id = auth.uid();
$$;

create or replace function public.eh_lideranca()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.meu_papel() in ('gerente', 'lider'), false);
$$;

create or replace function public.eh_gerente()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.meu_papel() = 'gerente', false);
$$;

-- Área de um colaborador (para escopo de líder), sem acionar RLS.
create or replace function public.area_do(uid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select area_id from profiles where id = uid;
$$;

-- ---------------------------------------------------------------------
-- Chamados
-- ---------------------------------------------------------------------
create sequence if not exists chamado_numero_seq start 1000;

create table chamados (
  id uuid primary key default gen_random_uuid(),
  numero bigint not null default nextval('chamado_numero_seq'),
  titulo text not null,
  descricao text,
  tipo chamado_tipo not null default 'outro',
  categoria text,
  prioridade chamado_prioridade not null default 'media',
  status chamado_status not null default 'aberto',
  solicitante_id uuid not null references profiles(id) on delete cascade,
  responsavel_id uuid references profiles(id) on delete set null,
  area_id uuid references areas(id) on delete set null,
  prazo_sla timestamptz,
  tarefa_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table chamado_comentarios (
  id uuid primary key default gen_random_uuid(),
  chamado_id uuid not null references chamados(id) on delete cascade,
  autor_id uuid not null references profiles(id) on delete cascade,
  texto text not null,
  created_at timestamptz not null default now()
);

create table chamado_anexos (
  id uuid primary key default gen_random_uuid(),
  chamado_id uuid not null references chamados(id) on delete cascade,
  arquivo_url text not null,
  nome text not null,
  created_at timestamptz not null default now()
);

create table chamado_historico (
  id uuid primary key default gen_random_uuid(),
  chamado_id uuid not null references chamados(id) on delete cascade,
  autor_id uuid references profiles(id) on delete set null,
  campo text not null,
  de text,
  para text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Operacional — tarefas
-- ---------------------------------------------------------------------
create table tarefas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  status tarefa_status not null default 'a_fazer',
  responsavel_id uuid references profiles(id) on delete set null,
  chamado_id uuid references chamados(id) on delete set null,
  prazo timestamptz,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

alter table chamados
  add constraint chamados_tarefa_fk foreign key (tarefa_id) references tarefas(id) on delete set null;

-- ---------------------------------------------------------------------
-- Notificações
-- ---------------------------------------------------------------------
create table notificacoes (
  id uuid primary key default gen_random_uuid(),
  destinatario_id uuid not null references profiles(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  link text,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Feedbacks e Desenvolvimento
-- ---------------------------------------------------------------------
create table feedbacks (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references profiles(id) on delete cascade,
  autor_id uuid not null references profiles(id) on delete cascade,
  data date not null default current_date,
  status feedback_status not null default 'rascunho',
  roteiro jsonb not null default '{}'::jsonb,
  resumo text,
  created_at timestamptz not null default now()
);

create table um_a_um (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references profiles(id) on delete cascade,
  lider_id uuid not null references profiles(id) on delete cascade,
  data date not null default current_date,
  tema text,
  anotacoes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table planos_acao (
  id uuid primary key default gen_random_uuid(),
  origem_tipo plano_origem not null,
  origem_id uuid,
  colaborador_id uuid not null references profiles(id) on delete cascade,
  autor_id uuid not null references profiles(id) on delete cascade,
  descricao text not null,
  resultado_esperado text,
  prazo date,
  status plano_status not null default 'aberto',
  proxima_conversa date,
  created_at timestamptz not null default now()
);

create table pontos_acompanhamento (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references profiles(id) on delete cascade,
  origem_id uuid,
  texto text not null,
  status plano_status not null default 'aberto',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Índices úteis
-- ---------------------------------------------------------------------
create index on chamados (status);
create index on chamados (responsavel_id);
create index on chamados (solicitante_id);
create index on tarefas (status);
create index on feedbacks (colaborador_id);
create index on um_a_um (colaborador_id);
create index on planos_acao (colaborador_id);
create index on notificacoes (destinatario_id, lida);

-- =====================================================================
-- Triggers
-- =====================================================================

-- Atualiza updated_at em chamados
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_chamados_updated
  before update on chamados
  for each row execute function public.set_updated_at();

-- Cria automaticamente um profile quando um usuário é criado no Auth.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::papel, 'colaborador')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table areas enable row level security;
alter table profiles enable row level security;
alter table chamados enable row level security;
alter table chamado_comentarios enable row level security;
alter table chamado_anexos enable row level security;
alter table chamado_historico enable row level security;
alter table tarefas enable row level security;
alter table notificacoes enable row level security;
alter table feedbacks enable row level security;
alter table um_a_um enable row level security;
alter table planos_acao enable row level security;
alter table pontos_acompanhamento enable row level security;

-- ---- areas ----------------------------------------------------------
create policy "areas_select" on areas for select using (auth.uid() is not null);
create policy "areas_admin" on areas for all using (public.eh_gerente()) with check (public.eh_gerente());

-- ---- profiles -------------------------------------------------------
-- Cada um vê a si mesmo; liderança vê todos; gerente gerencia todos.
create policy "profiles_select_self_or_lideranca" on profiles for select
  using (id = auth.uid() or public.eh_lideranca());
create policy "profiles_update_self" on profiles for update
  using (id = auth.uid());
create policy "profiles_admin" on profiles for all
  using (public.eh_gerente()) with check (public.eh_gerente());

-- ---- chamados -------------------------------------------------------
-- Ver: gerente tudo; líder da sua área; colaborador os que abriu/recebeu.
create policy "chamados_select" on chamados for select using (
  public.eh_gerente()
  or solicitante_id = auth.uid()
  or responsavel_id = auth.uid()
  or (public.meu_papel() = 'lider' and area_id is not distinct from public.minha_area())
);
-- Abrir: qualquer autenticado, como solicitante.
create policy "chamados_insert" on chamados for insert
  with check (solicitante_id = auth.uid());
-- Atualizar (triar/atribuir/status): liderança ou o próprio responsável.
create policy "chamados_update" on chamados for update using (
  public.eh_lideranca() or responsavel_id = auth.uid()
);

-- ---- chamado_comentarios --------------------------------------------
create policy "com_select" on chamado_comentarios for select using (
  exists (select 1 from chamados c where c.id = chamado_id)
);
create policy "com_insert" on chamado_comentarios for insert
  with check (autor_id = auth.uid());

-- ---- chamado_anexos -------------------------------------------------
create policy "anx_select" on chamado_anexos for select using (
  exists (select 1 from chamados c where c.id = chamado_id)
);
create policy "anx_insert" on chamado_anexos for insert with check (auth.uid() is not null);

-- ---- chamado_historico ----------------------------------------------
create policy "hist_select" on chamado_historico for select using (
  exists (select 1 from chamados c where c.id = chamado_id)
);
create policy "hist_insert" on chamado_historico for insert with check (auth.uid() is not null);

-- ---- tarefas --------------------------------------------------------
create policy "tarefas_select" on tarefas for select using (
  public.eh_lideranca() or responsavel_id = auth.uid()
);
create policy "tarefas_insert" on tarefas for insert with check (public.eh_lideranca());
create policy "tarefas_update" on tarefas for update using (
  public.eh_lideranca() or responsavel_id = auth.uid()
);

-- ---- notificacoes ---------------------------------------------------
create policy "notif_select" on notificacoes for select using (destinatario_id = auth.uid());
create policy "notif_update" on notificacoes for update using (destinatario_id = auth.uid());
create policy "notif_insert" on notificacoes for insert with check (auth.uid() is not null);

-- ---- feedbacks ------------------------------------------------------
-- Colaborador vê só o próprio; liderança vê os que conduziu ou da sua equipe.
create policy "fb_select" on feedbacks for select using (
  colaborador_id = auth.uid()
  or autor_id = auth.uid()
  or public.eh_gerente()
  or (public.meu_papel() = 'lider' and public.area_do(colaborador_id) is not distinct from public.minha_area())
);
create policy "fb_insert" on feedbacks for insert
  with check (public.eh_lideranca() and autor_id = auth.uid());
create policy "fb_update" on feedbacks for update using (autor_id = auth.uid() or public.eh_gerente());

-- ---- um_a_um --------------------------------------------------------
create policy "1a1_select" on um_a_um for select using (
  colaborador_id = auth.uid()
  or lider_id = auth.uid()
  or public.eh_gerente()
  or (public.meu_papel() = 'lider' and public.area_do(colaborador_id) is not distinct from public.minha_area())
);
create policy "1a1_insert" on um_a_um for insert
  with check (public.eh_lideranca() and lider_id = auth.uid());
create policy "1a1_update" on um_a_um for update using (lider_id = auth.uid() or public.eh_gerente());

-- ---- planos_acao ----------------------------------------------------
create policy "plano_select" on planos_acao for select using (
  colaborador_id = auth.uid()
  or autor_id = auth.uid()
  or public.eh_gerente()
  or (public.meu_papel() = 'lider' and public.area_do(colaborador_id) is not distinct from public.minha_area())
);
create policy "plano_insert" on planos_acao for insert with check (public.eh_lideranca());
create policy "plano_update" on planos_acao for update using (
  autor_id = auth.uid() or colaborador_id = auth.uid() or public.eh_gerente()
);

-- ---- pontos_acompanhamento ------------------------------------------
create policy "ponto_select" on pontos_acompanhamento for select using (
  colaborador_id = auth.uid()
  or public.eh_gerente()
  or (public.meu_papel() = 'lider' and public.area_do(colaborador_id) is not distinct from public.minha_area())
);
create policy "ponto_insert" on pontos_acompanhamento for insert with check (public.eh_lideranca());
create policy "ponto_update" on pontos_acompanhamento for update using (public.eh_lideranca());
