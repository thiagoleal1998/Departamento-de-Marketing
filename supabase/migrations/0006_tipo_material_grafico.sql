-- =====================================================================
-- 0006 — Novo tipo de chamado: Material gráfico
-- Rode DEPOIS das anteriores (e antes/junto de 0007).
-- =====================================================================

alter type chamado_tipo add value if not exists 'material_grafico';
