-- =====================================================================
-- 0080 — Senhas: cada pessoa cadastra, altera e exclui as próprias senhas.
-- O gerente continua podendo mexer em todas. Rode DEPOIS das anteriores.
-- =====================================================================

drop policy if exists "senhas_write" on senhas_acesso;
drop policy if exists "senhas_insert" on senhas_acesso;
drop policy if exists "senhas_update" on senhas_acesso;
drop policy if exists "senhas_delete" on senhas_acesso;

create policy "senhas_insert" on senhas_acesso
  for insert with check (auth.uid() is not null and (criado_por = auth.uid() or public.eh_gerente()));
create policy "senhas_update" on senhas_acesso
  for update using (public.eh_gerente() or criado_por = auth.uid())
  with check (public.eh_gerente() or criado_por = auth.uid());
create policy "senhas_delete" on senhas_acesso
  for delete using (public.eh_gerente() or criado_por = auth.uid());
