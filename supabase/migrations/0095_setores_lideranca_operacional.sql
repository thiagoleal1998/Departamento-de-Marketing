-- 0095 — Liderança Operacional como área própria, junto da liderança (antes dos três setores).
-- Quem lidera é movido de "Operacional" para ela em Gestão > Setores (no banco atual isso já foi feito pela API).
insert into setores (id, nome, ordem) values ('lideranca-operacional', 'Liderança Operacional', 4)
on conflict (id) do nothing;

update setores set ordem = 5 where id = 'operacional';
update setores set ordem = 6 where id = 'criacao';
update setores set ordem = 7 where id = 'midias-digitais';
