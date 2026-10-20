-- =====================================================================
-- 0049 — Chat com vínculos: mensagem pode apontar para um item do
-- estoque e/ou uma tarefa. Quem responde dá entrada no estoque e conclui
-- a tarefa direto da conversa.
-- Rode DEPOIS da 0048. Pode rodar mais de uma vez.
-- =====================================================================

alter table chat_mensagens
  add column if not exists tarefa_id uuid references tarefas(id) on delete set null;
alter table chat_mensagens
  add column if not exists estoque_item_id uuid references estoque_itens(id) on delete set null;

-- A tarefa lembra qual item do estoque ela repõe.
alter table tarefas
  add column if not exists estoque_item_id uuid references estoque_itens(id) on delete set null;

create index if not exists chat_msg_tarefa_idx on chat_mensagens (tarefa_id) where tarefa_id is not null;
