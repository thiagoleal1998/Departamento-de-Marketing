-- =====================================================================
-- 0039 — Atas: itens viram tarefas e a cobrança automática de prazos
-- • tarefas.ata_serie liga a tarefa ao assunto (série) da ata.
-- • cobrancas_log evita avisos duplicados (um por tarefa, tipo e dia).
-- • Cria as tarefas dos itens ainda abertos da última reunião importada.
-- Rode DEPOIS da 0038. Pode rodar mais de uma vez.
-- =====================================================================

alter table tarefas add column if not exists ata_serie text;
create unique index if not exists tarefas_ata_serie_uidx
  on tarefas (ata_serie) where ata_serie is not null;

create table if not exists cobrancas_log (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references tarefas(id) on delete cascade,
  tipo text not null, -- vespera | hoje | atraso | atraso_gerente
  dia date not null,
  created_at timestamptz not null default now(),
  unique (tarefa_id, tipo, dia)
);
alter table cobrancas_log enable row level security;
-- Sem policies: só o servidor (service role) lê e grava.

-- Tarefas para os itens abertos da última reunião -----------------------
insert into tarefas
  (titulo, descricao, status, responsavel_id, prazo, prioridade, link, tag, ata_serie)
select distinct on (i.serie)
  i.titulo,
  nullif(concat_ws(E'\n\n', i.detalhamento,
    case when i.plano_acao is not null then 'Plano de ação: ' || i.plano_acao end), ''),
  case i.status when 'em_andamento' then 'em_andamento' else 'a_fazer' end::tarefa_status,
  i.responsavel_id,
  i.prazo,
  i.prioridade,
  i.link,
  'Ata',
  i.serie
from reuniao_itens i
join reunioes r on r.id = i.reuniao_id
where r.data = (select max(data) from reunioes)
  and i.secao = 'ata'
  and coalesce(i.status, 'nao_iniciado') in ('nao_iniciado', 'em_andamento')
order by i.serie, i.ordem
on conflict (ata_serie) where ata_serie is not null do nothing;
