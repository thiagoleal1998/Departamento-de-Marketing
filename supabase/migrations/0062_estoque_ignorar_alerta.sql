-- =====================================================================
-- 0062 — Estoque: marcar um item para NÃO gerar alerta de estoque baixo
-- (produtos pontuais, não recorrentes). A observação do item já existe
-- (coluna observacoes). Pode rodar mais de uma vez.
-- =====================================================================

alter table estoque_itens add column if not exists ignorar_alerta boolean not null default false;
