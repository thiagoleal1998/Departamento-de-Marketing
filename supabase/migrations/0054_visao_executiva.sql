-- =====================================================================
-- 0054 — Visão geral para a diretoria (celular): marca quais usuários
-- acessam a página /executivo (resumo do marketing + aprovações).
-- O gerente liga/desliga em Configurações > usuário. Pode rodar mais de uma vez.
-- =====================================================================

alter table profiles
  add column if not exists visao_executiva boolean not null default false;
