-- =====================================================================
-- 0028 — Coloca as tarefas importadas do Notion nas colunas corretas
-- Rode DEPOIS do 0027 (em outra execução) e depois do 0026.
-- Pode rodar mais de uma vez.
-- =====================================================================

update tarefas
set status = case status_notion
  when 'Alterações' then 'alteracoes'::tarefa_status
  when 'Em aprovação - Gustavo' then 'aprovacao_gustavo'::tarefa_status
  when 'Em aprovação - Thiago' then 'aprovacao_thiago'::tarefa_status
  when 'Em aprovação - Marco' then 'aprovacao_marco'::tarefa_status
  else status
end
where notion_id is not null
  and status_notion in (
    'Alterações', 'Em aprovação - Gustavo',
    'Em aprovação - Thiago', 'Em aprovação - Marco'
  );
