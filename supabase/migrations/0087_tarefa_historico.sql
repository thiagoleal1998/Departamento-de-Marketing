-- =====================================================================
-- 0087 — Tarefas: histórico (linha do tempo do card).
-- Cada mudança relevante vira um registro: status, prazo (com o MOTIVO escolhido numa lista), responsável, colaborador,
-- solicitante, prioridade e título. Alimenta a linha do tempo do card e o relatório "Evolução do operacional".
-- Leitura: quem enxerga a tarefa (mesma regra de acesso da tarefa). Escrita: só o servidor (service role).
-- Pode rodar mais de uma vez.
-- =====================================================================

create table if not exists tarefa_historico (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references tarefas(id) on delete cascade,
  autor_id uuid references profiles(id) on delete set null,
  campo text not null,                 -- criada | status | prazo | responsavel | colaborador | solicitante | prioridade | titulo
  de text,                             -- valor anterior (texto de exibição; prazo em aaaa-mm-dd)
  para text,                           -- valor novo
  motivo text,                         -- chave da lista de motivos (só nas mudanças de prazo)
  detalhe text,                        -- observação livre sobre o motivo
  created_at timestamptz not null default now()
);
create index if not exists tarefa_historico_tarefa_idx on tarefa_historico (tarefa_id, created_at desc);
create index if not exists tarefa_historico_campo_idx on tarefa_historico (campo, created_at desc);

alter table tarefa_historico enable row level security;

drop policy if exists "tarefa_historico_select" on tarefa_historico;
create policy "tarefa_historico_select" on tarefa_historico
  for select using (exists (select 1 from tarefas t where t.id = tarefa_historico.tarefa_id));
-- Sem policies de escrita: apenas o servidor (service role) grava.
