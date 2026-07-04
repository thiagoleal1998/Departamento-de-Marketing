-- =====================================================================
-- 0007 — Campos de criação de peça / material gráfico + prazo de entrega
-- Rode DEPOIS de 0006.
-- =====================================================================

alter table chamados add column if not exists formato text;          -- Imagem/Vídeo/GIF
alter table chamados add column if not exists subtipo text;          -- Lâmina/Feed/Stories/...
alter table chamados add column if not exists material_grafico text; -- Flyer/Banner/Brindes/Outros
alter table chamados add column if not exists prazo_entrega date;    -- prazo de entrega do marketing
alter table chamados add column if not exists referencia_url text;   -- arquivo de referência (Storage)
alter table chamados add column if not exists referencia_nome text;
