-- =====================================================================
-- 0077 — Registro de acessos e atividades + autor dos itens do calendário.
--
-- • atividade_logins: cada entrada e saída do sistema (com IP e navegador).
-- • atividade_sessoes: tempo logado, ativo e inativo (o navegador manda um sinal
--   a cada minuto; "ativo" = mexeu em algo nos últimos 5 minutos). Também diz
--   quem está online agora.
-- • atividade_log: telas abertas e principais ações (criar/editar/excluir…).
-- • calendario_conteudo.criado_por: quem criou o item (colaborador só exclui o
--   que ele mesmo criou; gerente e líder excluem qualquer um).
--
-- As tabelas de atividade só são lidas e gravadas pelo servidor (sem políticas
-- para usuários); quem vê é a liderança, em Relatórios. Pode rodar mais de uma vez.
-- =====================================================================

alter table calendario_conteudo add column if not exists criado_por uuid references profiles(id) on delete set null;

create table if not exists atividade_logins (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references profiles(id) on delete cascade,
  em timestamptz not null default now(),
  evento text not null default 'login' check (evento in ('login', 'logout')),
  ip text,
  navegador text
);
create index if not exists atividade_logins_usuario_idx on atividade_logins (usuario_id, em desc);
create index if not exists atividade_logins_em_idx on atividade_logins (em desc);

create table if not exists atividade_sessoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references profiles(id) on delete cascade,
  inicio timestamptz not null default now(),
  ultimo_sinal timestamptz not null default now(),
  segundos_ativo integer not null default 0,
  segundos_inativo integer not null default 0,
  ativo_agora boolean not null default true,
  caminho text
);
create index if not exists atividade_sessoes_usuario_idx on atividade_sessoes (usuario_id, ultimo_sinal desc);
create index if not exists atividade_sessoes_sinal_idx on atividade_sessoes (ultimo_sinal desc);

create table if not exists atividade_log (
  id bigint generated always as identity primary key,
  usuario_id uuid references profiles(id) on delete cascade,
  em timestamptz not null default now(),
  tipo text not null default 'acao' check (tipo in ('pagina', 'acao')),
  acao text not null,
  detalhe text,
  caminho text
);
create index if not exists atividade_log_em_idx on atividade_log (em desc);
create index if not exists atividade_log_usuario_idx on atividade_log (usuario_id, em desc);

alter table atividade_logins enable row level security;
alter table atividade_sessoes enable row level security;
alter table atividade_log enable row level security;
