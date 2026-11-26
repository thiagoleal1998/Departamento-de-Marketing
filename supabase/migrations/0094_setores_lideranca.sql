-- 0094 — Diretoria, Gerência e Supervisão na página inicial (antes dos três setores)
insert into setores (id, nome, ordem) values
  ('diretoria', 'Diretoria', 1),
  ('gerencia', 'Gerência', 2),
  ('supervisao', 'Supervisão', 3)
on conflict (id) do nothing;

update setores set ordem = 4 where id = 'operacional';
update setores set ordem = 5 where id = 'criacao';
update setores set ordem = 6 where id = 'midias-digitais';
