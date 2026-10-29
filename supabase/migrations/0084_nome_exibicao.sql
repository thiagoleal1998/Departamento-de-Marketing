-- =====================================================================
-- 0084 — Perfil: "como quero ser chamado(a)".
-- Nome curto escolhido pela própria pessoa (ex.: "Gustavo Moken"), usado no chat.
-- Vazio = usa o nome completo. Pode rodar mais de uma vez.
-- =====================================================================

alter table profiles add column if not exists nome_exibicao text;
