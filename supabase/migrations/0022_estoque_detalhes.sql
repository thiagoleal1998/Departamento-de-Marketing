-- =====================================================================
-- 0022 — Estoque: descrição, cor, danificados e observações
-- Rode DEPOIS da 0012 e ANTES da 0023 (importação do inventário).
-- =====================================================================

alter table estoque_itens add column if not exists descricao text;
alter table estoque_itens add column if not exists cor text;
alter table estoque_itens add column if not exists danificados int not null default 0
  check (danificados >= 0);
alter table estoque_itens add column if not exists observacoes text;
