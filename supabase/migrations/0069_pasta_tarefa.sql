-- =====================================================================
-- 0069 — Caminho da pasta na tarefa e unidades de rede por usuário.
-- A tarefa guarda a raiz (corporativo, público ou HD) e o caminho SEM a letra
-- da unidade; cada pessoa define no perfil qual letra usa para cada raiz
-- (ex.: Corporativo = X:), e o caminho aparece certo no computador dela.
-- Pode rodar mais de uma vez.
-- =====================================================================

alter table tarefas add column if not exists pasta_raiz text;
alter table tarefas add column if not exists pasta_caminho text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tarefas_pasta_raiz_check') then
    alter table tarefas add constraint tarefas_pasta_raiz_check
      check (pasta_raiz is null or pasta_raiz in ('corporativo', 'publico', 'hd'));
  end if;
end $$;

alter table profiles add column if not exists pasta_unidades jsonb;
