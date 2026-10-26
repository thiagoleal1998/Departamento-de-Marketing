-- =====================================================================
-- 0070 — Colaborador na tarefa.
-- Além do responsável, o card pode ter um colaborador: ele enxerga e edita o
-- card, como o responsável. Pode rodar mais de uma vez.
-- =====================================================================

alter table tarefas add column if not exists colaborador_id uuid references profiles(id) on delete set null;
create index if not exists tarefas_colaborador_idx on tarefas (colaborador_id);

drop policy if exists "tarefas_select" on tarefas;
create policy "tarefas_select" on tarefas for select using (
  public.eh_lideranca() or responsavel_id = auth.uid() or colaborador_id = auth.uid()
);

drop policy if exists "tarefas_update" on tarefas;
create policy "tarefas_update" on tarefas for update using (
  public.eh_lideranca() or responsavel_id = auth.uid() or colaborador_id = auth.uid()
);
