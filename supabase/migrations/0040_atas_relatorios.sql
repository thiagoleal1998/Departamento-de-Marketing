-- =====================================================================
-- 0040 — Atas: campos pré-definidos para os relatórios
--  • categoria: tipo de demanda (lâmina/arte, e-mail, LP/site...).
--  • motivo: principal motivo quando o prazo ou o andamento muda.
-- Também vincula aos usuários os itens que citam pessoas ainda sem vínculo
-- (rode de novo depois de criar o perfil de alguém, ex.: Cesar Ricart).
-- Rode DEPOIS da 0038. Pode rodar mais de uma vez.
-- =====================================================================

alter table reuniao_itens add column if not exists categoria text;
alter table reuniao_itens add column if not exists motivo text;

alter table reuniao_itens drop constraint if exists reuniao_itens_categoria_check;
alter table reuniao_itens add constraint reuniao_itens_categoria_check
  check (categoria is null or categoria in (
    'lamina_arte', 'email', 'lp_site', 'video', 'campanha',
    'evento', 'brindes', 'processo', 'outro'));

alter table reuniao_itens drop constraint if exists reuniao_itens_motivo_check;
alter table reuniao_itens add constraint reuniao_itens_motivo_check
  check (motivo is null or motivo in (
    'aguardando_aprovacao', 'aguardando_terceiros', 'falta_material',
    'mudanca_prioridade', 'demanda_urgente', 'falta_tempo', 'ausencia',
    'replanejamento', 'dependencia_ti', 'sem_necessidade', 'outro'));

-- Vínculo por nome (itens sem usuário vinculado) -----------------------
update reuniao_itens i
set responsavel_id = p.id
from profiles p
where i.responsavel_id is null
  and i.responsaveis_texto is not null
  and p.nome ilike split_part(i.responsaveis_texto, ',', 1) || '%'
  and (select count(*) from profiles q
       where q.nome ilike split_part(i.responsaveis_texto, ',', 1) || '%') = 1;

-- Tarefas criadas a partir da ata herdam o responsável do item mais recente.
update tarefas t
set responsavel_id = x.responsavel_id
from (
  select distinct on (i.serie) i.serie, i.responsavel_id
  from reuniao_itens i
  join reunioes r on r.id = i.reuniao_id
  where i.responsavel_id is not null
  order by i.serie, r.data desc
) x
where t.ata_serie = x.serie
  and t.responsavel_id is null;
