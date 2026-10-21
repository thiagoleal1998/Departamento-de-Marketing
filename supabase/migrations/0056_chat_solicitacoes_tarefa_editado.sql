-- =====================================================================
-- 0056 — Solicitações do chat: tarefa criada para quem executa, marca de
-- "Editado" (como no WhatsApp) e atualização em tempo real do cartão.
-- Rode DEPOIS da 0055. Pode rodar mais de uma vez.
-- =====================================================================

alter table chat_solicitacoes
  add column if not exists tarefa_id uuid references tarefas(id) on delete set null;
alter table chat_solicitacoes
  add column if not exists editado_em timestamptz;

-- Para o cartão mudar na hora para quem está vendo a conversa.
do $$
begin
  alter publication supabase_realtime add table chat_solicitacoes;
exception when others then
  null; -- já estava na publicação (ou o recurso não está habilitado)
end $$;
