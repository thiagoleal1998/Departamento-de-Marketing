-- =====================================================================
-- 0008 — Fluxo de aprovação dos chamados
-- Gerente aprova/reprova (justificativa opcional); líder aceita para
-- começar (justificativa obrigatória), mas a aprovação segue pendente.
-- Rode DEPOIS das anteriores.
-- =====================================================================

alter table chamados add column if not exists aprovacao text not null default 'pendente';
alter table chamados add column if not exists aprovacao_justificativa text;
alter table chamados add column if not exists aprovado_por uuid references profiles(id) on delete set null;
alter table chamados add column if not exists aprovado_em timestamptz;
alter table chamados add column if not exists aceito_por uuid references profiles(id) on delete set null;
alter table chamados add column if not exists aceite_justificativa text;
alter table chamados add column if not exists aceito_em timestamptz;
