-- =====================================================================
-- 0058 — Anotações no histórico das Landing Pages (ex.: "budget subiu
-- para R$ 5 mil"). Rode DEPOIS da 0057. Pode rodar mais de uma vez.
-- =====================================================================

alter table landing_pages_historico add column if not exists nota text;

alter table landing_pages_historico drop constraint if exists landing_pages_historico_acao_check;
alter table landing_pages_historico
  add constraint landing_pages_historico_acao_check
  check (acao in ('criada', 'alterada', 'excluida', 'anotacao'));
