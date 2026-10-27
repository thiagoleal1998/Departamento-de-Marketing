-- =====================================================================
-- 0078 — Todo projeto (famtour, evento, feira, VT…) ganha um card em Tarefas.
-- O card guarda a qual projeto pertence (projeto_id), para o quadro mostrar o
-- botão "Abrir projeto". Pode rodar mais de uma vez.
-- =====================================================================

alter table tarefas add column if not exists projeto_id uuid references projetos(id) on delete set null;
create index if not exists tarefas_projeto_idx on tarefas (projeto_id) where projeto_id is not null;

-- Liga ao projeto os cards que já foram criados para ele (mesmo nome, criados junto com o projeto).
update tarefas t
set projeto_id = p.id
from projetos p
where t.projeto_id is null
  and t.etapa_id is null
  and t.chamado_id is null
  and t.titulo = p.nome
  and abs(extract(epoch from (t.created_at - p.created_at))) < 86400;
