-- =====================================================================
-- 0053 — Estoque: qualquer pessoa logada do time pode renomear itens.
-- A função troca o nome e grava o registro (quem, quando, nome anterior e
-- novo) na mesma transação: não existe troca sem registro. As demais
-- edições do item (mínimo, remover) continuam só para o gerente.
-- Rode DEPOIS da 0052. Pode rodar mais de uma vez.
-- =====================================================================

create or replace function public.renomear_item_estoque(p_item uuid, p_nome text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_atual text;
  v_nome text := regexp_replace(trim(coalesce(p_nome, '')), '\s+', ' ', 'g');
begin
  if auth.uid() is null then
    raise exception 'Sessão expirada.';
  end if;
  if length(v_nome) = 0 then
    raise exception 'Informe o novo nome.';
  end if;
  if length(v_nome) > 120 then
    raise exception 'O nome pode ter no máximo 120 caracteres.';
  end if;

  select nome into v_atual from estoque_itens where id = p_item and ativo for update;
  if not found then
    raise exception 'Item não encontrado.';
  end if;
  if v_atual = v_nome then
    raise exception 'O nome é o mesmo que o atual.';
  end if;

  update estoque_itens set nome = v_nome where id = p_item;

  insert into estoque_alteracoes (item_id, campo, valor_anterior, valor_novo, usuario_id)
  values (p_item, 'nome', v_atual, v_nome, auth.uid());
end;
$$;

revoke all on function public.renomear_item_estoque(uuid, text) from public;
grant execute on function public.renomear_item_estoque(uuid, text) to authenticated;
