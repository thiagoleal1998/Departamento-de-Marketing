-- =====================================================================
-- 0074 — "Marcar como visto" nas alterações do Comercial.
-- Cada pessoa guarda até quando já viu as alterações; o aviso amarelo, os selos
-- das abas e a marca "alterado" dos produtos só mostram o que mudou depois disso.
-- Pode rodar mais de uma vez.
-- =====================================================================

alter table profiles add column if not exists comercial_visto_em timestamptz;
