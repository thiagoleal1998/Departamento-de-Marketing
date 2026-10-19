-- =====================================================================
-- 0041 — Equipe das atas: afastamentos e desligamentos
--  • afastado: a pessoa fica "afastada" a partir de `desde` (não entra no
--    cálculo de frequência e aparece como afastada nos relatórios).
--  • desligado: não faz mais parte da equipe (sai dos relatórios e das
--    próximas listas de presença).
-- Pessoas que não constam aqui são tratadas como ativas.
-- Rode DEPOIS da 0038. Pode rodar mais de uma vez.
-- =====================================================================

create table if not exists ata_membros (
  nome text primary key,
  situacao text not null default 'ativo'
    check (situacao in ('ativo', 'afastado', 'desligado')),
  desde date,
  observacao text,
  updated_at timestamptz not null default now()
);

alter table ata_membros enable row level security;

drop policy if exists "ata_membros_select" on ata_membros;
create policy "ata_membros_select" on ata_membros for select using (auth.uid() is not null);
drop policy if exists "ata_membros_write" on ata_membros;
create policy "ata_membros_write" on ata_membros for all
  using (public.eh_lideranca()) with check (public.eh_lideranca());

insert into ata_membros (nome, situacao, desde, observacao) values
  ('Jéssica Esteves', 'afastado', '2026-01-05', 'Afastada (atestado médico)'),
  ('Stephanie Mesquita', 'desligado', null, 'Não faz mais parte da equipe')
on conflict (nome) do update
  set situacao = excluded.situacao,
      desde = excluded.desde,
      observacao = excluded.observacao,
      updated_at = now();
