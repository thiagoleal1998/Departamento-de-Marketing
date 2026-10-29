-- =====================================================================
-- 0085 — Fluxos e processos (Gestão): macroprocessos, processos, fluxos e histórico.
-- Hierarquia: Departamento → Macroprocessos → Processos → Fluxos → Etapas.
-- O fluxo (etapas e ligações) fica em JSON; guarda também a última versão PUBLICADA, para que uma edição ainda não
-- aprovada não altere em silêncio o que está valendo. Fluxo ATUAL (como a equipe trabalha hoje) e PROPOSTO (melhorias
-- ainda não implantadas) ficam separados.
-- Leitura: usuários autenticados. Escrita: liderança. Pode rodar mais de uma vez.
-- =====================================================================

create table if not exists proc_macroprocessos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  sigla text not null,                 -- usada no código dos processos (MKT-COM-001)
  descricao text,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists proc_processos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  macroprocesso_id uuid references proc_macroprocessos(id) on delete set null,
  descricao text,
  objetivo text,
  gatilho text,                        -- o que inicia o processo
  entradas text,
  saidas text,                         -- entrega final
  responsavel_id uuid references profiles(id) on delete set null,   -- dono do processo
  areas text[] not null default '{}',
  ferramentas text[] not null default '{}',
  prazo_referencia text,
  indicadores text,
  documentos text,
  status text not null default 'rascunho' check (status in ('rascunho', 'revisao', 'publicado')),
  versao int not null default 1,
  publicado_em timestamptz,
  ultima_revisao date,
  proxima_revisao date,
  criado_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists proc_processos_macro_idx on proc_processos (macroprocesso_id);

create table if not exists proc_fluxos (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references proc_processos(id) on delete cascade,
  tipo text not null check (tipo in ('atual', 'proposto')),
  dados jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,   -- rascunho de trabalho
  publicado jsonb,                                                  -- última versão publicada
  updated_at timestamptz not null default now(),
  unique (processo_id, tipo)
);

create table if not exists proc_historico (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references proc_processos(id) on delete cascade,
  autor_id uuid references profiles(id) on delete set null,
  acao text not null,
  detalhe text,
  created_at timestamptz not null default now()
);
create index if not exists proc_historico_idx on proc_historico (processo_id, created_at desc);

alter table proc_macroprocessos enable row level security;
alter table proc_processos enable row level security;
alter table proc_fluxos enable row level security;
alter table proc_historico enable row level security;

do $$
declare t text;
begin
  foreach t in array array['proc_macroprocessos', 'proc_processos', 'proc_fluxos', 'proc_historico'] loop
    execute format('drop policy if exists %I on %I', t || '_select', t);
    execute format('create policy %I on %I for select using (auth.uid() is not null)', t || '_select', t);
    execute format('drop policy if exists %I on %I', t || '_escrita', t);
    execute format('create policy %I on %I for all using (public.eh_lideranca()) with check (public.eh_lideranca())', t || '_escrita', t);
  end loop;
end $$;

-- Macroprocessos iniciais (editáveis: não são uma estrutura definitiva).
insert into proc_macroprocessos (nome, sigla, descricao, ordem)
select v.nome, v.sigla, v.descricao, v.ordem
from (values
  ('Planejamento e Gestão', 'PLA', 'Planejamento de campanhas, calendário editorial, distribuição de demandas, prioridades e indicadores', 1),
  ('Criação e Design', 'CRI', 'Banners, lâminas, pop-ups, posts, peças institucionais e materiais gráficos', 2),
  ('Comunicação e Conteúdo', 'COM', 'E-mails B2C/B2B, LV News, releases, blog, roteiros e comunicação interna', 3),
  ('Marketing Digital', 'DIG', 'Landing pages, SEO, campanhas digitais, RD Station e automações', 4),
  ('Audiovisual', 'AUD', 'Vídeos promocionais, podcasts, gravações, edição e publicação', 5),
  ('Eventos e Treinamentos', 'EVE', 'Divulgação de treinamentos, feiras, eventos, parcerias e Universidade LV', 6),
  ('Aprovação e Qualidade', 'APR', 'Revisão textual, validação comercial, aprovação da gestão, testes e publicação', 7)
) as v(nome, sigla, descricao, ordem)
where not exists (select 1 from proc_macroprocessos);

-- Processo demonstrativo: Produção de E-mail Marketing (nomes de responsáveis e prazos são sugestões editáveis).
insert into proc_processos (codigo, nome, macroprocesso_id, descricao, objetivo, gatilho, entradas, saidas, areas, ferramentas, prazo_referencia, indicadores, status)
select 'MKT-COM-001', 'Produção de E-mail Marketing', m.id,
  'Da solicitação ao encerramento: briefing, redação, criação visual, revisão, aprovação, configuração, testes, envio e monitoramento.',
  'Entregar e-mails marketing corretos, aprovados e dentro do prazo, padronizando briefing, revisão e aprovação.',
  'Solicitação de e-mail (campanha, oferta, LV News ou outra demanda).',
  'Briefing com objetivo, público, data de envio, ofertas e condições.',
  'E-mail revisado, aprovado, testado e enviado ou programado, com resultados registrados.',
  array['Marketing', 'Comercial'], array['RD Station'], 'A definir',
  'Taxa de abertura, cliques e retrabalho nas aprovações', 'rascunho'
from proc_macroprocessos m
where m.sigla = 'COM'
  and not exists (select 1 from proc_processos where codigo = 'MKT-COM-001');

insert into proc_fluxos (processo_id, tipo, dados)
select p.id, 'atual', $fluxo${"nodes":[{"id":"inicio","type":"bloco","position":{"x":300,"y":0},"data":{"tipo":"inicio","nome":"Solicitação de e-mail","descricao":"Chega um pedido de e-mail marketing (campanha, oferta, LV News…)."}},{"id":"briefing","type":"bloco","position":{"x":300,"y":120},"data":{"tipo":"atividade","nome":"Recebimento do briefing","responsavel":"Supervisão","entrada":"Pedido de e-mail","instrucoes":"Conferir se o briefing traz objetivo, público (B2B/B2C), data de envio, ofertas e condições.","criterio":"Briefing completo","prazo":"A definir","checklist":["Objetivo definido","Público definido","Data de envio","Ofertas e condições"]}},{"id":"pauta","type":"bloco","position":{"x":300,"y":240},"data":{"tipo":"atividade","nome":"Planejamento e definição da comunicação","responsavel":"Supervisão","entrada":"Briefing completo","instrucoes":"Definir mensagem principal, assunto, chamada e ordem das ofertas. Encaixar no calendário.","criterio":"Pauta definida","prazo":"A definir"}},{"id":"redacao","type":"bloco","position":{"x":300,"y":360},"data":{"tipo":"atividade","nome":"Redação","responsavel":"Conteúdo","entrada":"Pauta definida","instrucoes":"Escrever assunto, pré-cabeçalho, textos e chamadas para ação.","criterio":"Texto finalizado","prazo":"A definir"}},{"id":"visual","type":"bloco","position":{"x":300,"y":480},"data":{"tipo":"atividade","nome":"Criação visual","responsavel":"Design","entrada":"Texto finalizado","instrucoes":"Criar o layout e as peças do e-mail, respeitando a identidade visual.","ferramentas":"Ferramentas de design, RD Station","criterio":"Layout finalizado","prazo":"A definir"}},{"id":"revisao","type":"bloco","position":{"x":300,"y":600},"data":{"tipo":"atividade","nome":"Revisão","responsavel":"Conteúdo / Supervisão","entrada":"Texto e layout finalizados","instrucoes":"Revisar ortografia, preços, condições, datas, links e consistência visual.","criterio":"Comunicação validada","prazo":"A definir","procedimentos":"Checklist de revisão de e-mail","checklist":["Ortografia","Preços e condições","Datas","Links","Consistência visual"]}},{"id":"aprovacao","type":"bloco","position":{"x":300,"y":720},"data":{"tipo":"aprovacao","nome":"Aprovação","responsavel":"Supervisão","entrada":"Comunicação revisada","instrucoes":"Validar a comunicação com a gestão e, quando houver condições comerciais, com o Comercial.","criterio":"Quem aprova: gestão (e Comercial, quando houver condições). O que é validado: texto, ofertas, condições e visual.","prazo":"A definir"}},{"id":"decisao","type":"bloco","position":{"x":300,"y":840},"data":{"tipo":"decisao","nome":"Aprovado?","descricao":"A comunicação foi aprovada?"}},{"id":"correcoes","type":"bloco","position":{"x":640,"y":840},"data":{"tipo":"atividade","nome":"Correções","responsavel":"Conteúdo / Design","entrada":"Observações da aprovação","instrucoes":"Ajustar o que foi apontado e devolver para revisão.","criterio":"Ajustes feitos","prazo":"A definir"}},{"id":"config","type":"bloco","position":{"x":300,"y":980},"data":{"tipo":"atividade","nome":"Configuração do disparo","responsavel":"Marketing Digital","entrada":"Material aprovado","instrucoes":"Montar o e-mail na plataforma de disparo, configurar lista, segmentação, remetente e assunto.","ferramentas":"RD Station","criterio":"Disparo configurado","prazo":"A definir","procedimentos":"Como configurar, testar e programar um disparo no RD Station"}},{"id":"testes","type":"bloco","position":{"x":300,"y":1100},"data":{"tipo":"atividade","nome":"Testes","responsavel":"Marketing Digital","entrada":"Disparo configurado","instrucoes":"Enviar teste, conferir links, imagens, responsividade e variáveis.","ferramentas":"RD Station","criterio":"Teste aprovado","prazo":"A definir"}},{"id":"envio","type":"bloco","position":{"x":300,"y":1220},"data":{"tipo":"atividade","nome":"Programação ou envio","responsavel":"Marketing Digital","entrada":"Teste aprovado","instrucoes":"Programar o envio para a data e o horário combinados ou enviar na hora.","ferramentas":"RD Station","criterio":"E-mail programado ou enviado","prazo":"A definir"}},{"id":"monitoramento","type":"bloco","position":{"x":300,"y":1340},"data":{"tipo":"atividade","nome":"Monitoramento e encerramento","responsavel":"Marketing Digital","entrada":"E-mail enviado","instrucoes":"Acompanhar abertura, cliques e problemas; registrar resultados e encerrar a demanda.","criterio":"Resultados registrados","prazo":"A definir"}},{"id":"fim","type":"bloco","position":{"x":300,"y":1460},"data":{"tipo":"fim","nome":"E-mail entregue e demanda encerrada"}}],"edges":[{"id":"inicio-briefing","source":"inicio","target":"briefing","sourceHandle":"b","targetHandle":"t"},{"id":"briefing-pauta","source":"briefing","target":"pauta","sourceHandle":"b","targetHandle":"t"},{"id":"pauta-redacao","source":"pauta","target":"redacao","sourceHandle":"b","targetHandle":"t"},{"id":"redacao-visual","source":"redacao","target":"visual","sourceHandle":"b","targetHandle":"t"},{"id":"visual-revisao","source":"visual","target":"revisao","sourceHandle":"b","targetHandle":"t"},{"id":"revisao-aprovacao","source":"revisao","target":"aprovacao","sourceHandle":"b","targetHandle":"t"},{"id":"aprovacao-decisao","source":"aprovacao","target":"decisao","sourceHandle":"b","targetHandle":"t"},{"id":"decisao-config","source":"decisao","target":"config","sourceHandle":"b","targetHandle":"t","label":"Sim"},{"id":"decisao-correcoes","source":"decisao","target":"correcoes","sourceHandle":"r","targetHandle":"l","label":"Não"},{"id":"correcoes-revisao","source":"correcoes","target":"revisao","sourceHandle":"t","targetHandle":"r"},{"id":"config-testes","source":"config","target":"testes","sourceHandle":"b","targetHandle":"t"},{"id":"testes-envio","source":"testes","target":"envio","sourceHandle":"b","targetHandle":"t"},{"id":"envio-monitoramento","source":"envio","target":"monitoramento","sourceHandle":"b","targetHandle":"t"},{"id":"monitoramento-fim","source":"monitoramento","target":"fim","sourceHandle":"b","targetHandle":"t"}]}$fluxo$::jsonb
from proc_processos p
where p.codigo = 'MKT-COM-001'
  and not exists (select 1 from proc_fluxos f where f.processo_id = p.id and f.tipo = 'atual');
