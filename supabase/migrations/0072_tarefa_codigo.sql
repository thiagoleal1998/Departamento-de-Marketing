-- =====================================================================
-- 0072 — Código de cada tarefa: TAFMKT - 001/2026 (número sequencial por ano).
-- As tarefas existentes são numeradas pela data de criação; as novas recebem o
-- próximo número do ano automaticamente. Pode rodar mais de uma vez.
-- =====================================================================

alter table tarefas add column if not exists numero integer;
alter table tarefas add column if not exists ano integer;

-- Numera as tarefas que ainda não têm código (mais antigas primeiro, dentro de cada ano, no horário de Brasília).
with ordenadas as (
  select
    id,
    extract(year from (created_at at time zone 'America/Sao_Paulo'))::int as a,
    row_number() over (
      partition by extract(year from (created_at at time zone 'America/Sao_Paulo'))
      order by created_at, id
    ) as n
  from tarefas
  where numero is null
)
update tarefas t
set ano = o.a,
    numero = o.n + coalesce((select max(x.numero) from tarefas x where x.ano = o.a), 0)
from ordenadas o
where t.id = o.id;

create unique index if not exists tarefas_ano_numero_idx on tarefas (ano, numero);

create or replace function public.tarefa_numerar() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.numero is null then
    new.ano := extract(year from (coalesce(new.created_at, now()) at time zone 'America/Sao_Paulo'))::int;
    -- Evita dois cards criados ao mesmo tempo com o mesmo número.
    perform pg_advisory_xact_lock(hashtext('tarefa_numero_' || new.ano::text));
    select coalesce(max(numero), 0) + 1 into new.numero from tarefas where ano = new.ano;
  end if;
  return new;
end;
$$;

drop trigger if exists tarefa_numerar on tarefas;
create trigger tarefa_numerar before insert on tarefas
  for each row execute function public.tarefa_numerar();
