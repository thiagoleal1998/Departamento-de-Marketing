-- =====================================================================
-- 0051 — Chat: vários itens de estoque na mesma mensagem/tarefa.
-- Guarda uma lista [{ "id": "<item>", "qtd": <quantidade pedida ou null> }].
-- As colunas antigas (estoque_item_id) continuam e apontam para o 1º item.
-- Rode DEPOIS da 0050. Pode rodar mais de uma vez.
-- =====================================================================

alter table chat_mensagens
  add column if not exists estoque_itens jsonb not null default '[]'::jsonb;
alter table tarefas
  add column if not exists estoque_itens jsonb not null default '[]'::jsonb;

-- Aproveita o que já foi vinculado com um único item.
update chat_mensagens
set estoque_itens = jsonb_build_array(jsonb_build_object('id', estoque_item_id, 'qtd', null))
where estoque_item_id is not null and estoque_itens = '[]'::jsonb;

update tarefas
set estoque_itens = jsonb_build_array(jsonb_build_object('id', estoque_item_id, 'qtd', null))
where estoque_item_id is not null and estoque_itens = '[]'::jsonb;
