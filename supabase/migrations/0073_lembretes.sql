-- =====================================================================
-- 0073 — Lembretes (notificações) em tarefas e itens do calendário.
-- Cada tarefa/item guarda quantos dias antes quer ser avisado (0 = no dia,
-- 1 = um dia antes, 2, 7). Todo dia, às 8h (Brasília), o sistema avisa quem é
-- responsável. lembretes_enviados evita avisar duas vezes o mesmo lembrete.
-- Pode rodar mais de uma vez.
-- =====================================================================

alter table tarefas add column if not exists lembretes integer[] not null default '{}';
alter table calendario_conteudo add column if not exists lembretes integer[] not null default '{}';

create table if not exists lembretes_enviados (
  origem text not null check (origem in ('tarefa', 'calendario')),
  origem_id uuid not null,
  dias integer not null,
  dia date not null,
  criado_em timestamptz not null default now(),
  primary key (origem, origem_id, dias, dia)
);

-- Só o servidor (chave de serviço) grava e lê: sem políticas para usuários.
alter table lembretes_enviados enable row level security;
