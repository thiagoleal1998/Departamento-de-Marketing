-- =====================================================================
-- 0005 — Novos tipos de chamado: Alteração e Correção
-- Rode DEPOIS das anteriores.
-- =====================================================================

alter type chamado_tipo add value if not exists 'alteracao';
alter type chamado_tipo add value if not exists 'correcao';
