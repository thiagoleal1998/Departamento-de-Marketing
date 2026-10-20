-- =====================================================================
-- 0046 — Projetos do Notion (10 projetos de Marketing)
-- Fonte: Notion "Projetos". Pode rodar mais de uma vez (usa notion_id).
-- Rode DEPOIS da 0034.
-- =====================================================================

alter table projetos add column if not exists notion_id text unique;

insert into projetos (nome, descricao, status, responsavel_id, data_inicio, categoria, notion_id)
select
  t.nome,
  t.descricao,
  t.status,
  (select p.id from profiles p where lower(p.email) = t.resp_email limit 1),
  t.data_inicio::date,
  'projetos_marketing',
  t.notion_id
from jsonb_to_recordset($j$[{"notion_id":"2b96c40ae408802387c1c2110b5caea2","nome":"Apresentação de sistema organizador no Notion","status":"planejamento","resp_email":"social.media@litoralverde.com.br","data_inicio":"2025-03-24","descricao":"Horizonte: Curto · Prioridade: Média"},{"notion_id":"2b96c40ae408804fa9a5c205b095b5e6","nome":"Nova Página Inicial","status":"planejamento","resp_email":"thiago.leal@litoralverde.com.br","data_inicio":null,"descricao":"Horizonte: Longo · Link: https://trello.com/c/EPA8otGK"},{"notion_id":"2b96c40ae4088080bfd6fc7afc95ef49","nome":"Email Interno","status":"planejamento","resp_email":"thiago.leal@litoralverde.com.br","data_inicio":null,"descricao":"Horizonte: Longo"},{"notion_id":"2b96c40ae4088082a4f0fd315c261a64","nome":"Desenvolvimento - Aplicativo - FabApp","status":"planejamento","resp_email":"thiago.leal@litoralverde.com.br","data_inicio":null,"descricao":null},{"notion_id":"2b96c40ae408808e9d6beaeb734f0a2b","nome":"Página: Evite fraudes","status":"planejamento","resp_email":"thiago.leal@litoralverde.com.br","data_inicio":null,"descricao":null},{"notion_id":"2b96c40ae40880a38336f9a8edf90786","nome":"Integração com o instagram","status":"planejamento","resp_email":"thiago.leal@litoralverde.com.br","data_inicio":null,"descricao":null},{"notion_id":"2b96c40ae40880b5a204f8bd89aac214","nome":"Consórcio de Viagens LV","status":"planejamento","resp_email":"thiago.leal@litoralverde.com.br","data_inicio":null,"descricao":null},{"notion_id":"2b96c40ae40880c2a171d86eed72c4be","nome":"Conteúdos de Hotéis para o site","status":"em_andamento","resp_email":"social.media@litoralverde.com.br","data_inicio":"2025-04-09","descricao":"Horizonte: Longo · Prioridade: Média"},{"notion_id":"2b96c40ae40880e48b21d02090b4cb8e","nome":"Arte para parede da sala","status":"planejamento","resp_email":"thiago.leal@litoralverde.com.br","data_inicio":null,"descricao":"Horizonte: Longo · Link: https://trello.com/c/DBTVh5p9"},{"notion_id":"2b96c40ae40880fcac81edb966cae4fe","nome":"Novas Peças de Merchandesing","status":"planejamento","resp_email":"thiago.leal@litoralverde.com.br","data_inicio":null,"descricao":"Link: https://trello.com/c/Rj79d5AX"}]$j$::jsonb)
  as t(notion_id text, nome text, descricao text, status text, resp_email text, data_inicio text)
on conflict (notion_id) do nothing;
