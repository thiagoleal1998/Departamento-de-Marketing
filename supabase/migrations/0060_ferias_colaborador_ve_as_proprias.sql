-- =====================================================================
-- 0060 — Férias: liderança (gerente e líder) vê todo o time; colaborador
-- vê só as próprias. Cadastro, edição e exclusão continuam só da liderança.
-- Rode DEPOIS da 0059. Pode rodar mais de uma vez.
-- =====================================================================

drop policy if exists "ferias_select" on ferias;
create policy "ferias_select" on ferias
  for select using (public.eh_lideranca() or profile_id = auth.uid());
