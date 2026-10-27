-- =====================================================================
-- 0079 — Foto de capa e logo do parceiro nos projetos (famtour, evento, feira…).
-- As imagens ficam no bucket público "referencias"; aqui só se guarda o endereço.
-- Pode rodar mais de uma vez.
-- =====================================================================

alter table projetos add column if not exists capa_url text;
alter table projetos add column if not exists logo_parceiro_url text;
