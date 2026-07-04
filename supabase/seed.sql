-- =====================================================================
-- Seed de demonstração — Painel do Departamento de Marketing
-- Rode DEPOIS de 0001_init.sql, no SQL Editor do Supabase.
--
-- Cria 3 usuários de exemplo (senha padrão: senha123):
--   gerente@exemplo.com      -> Gerente
--   lider@exemplo.com        -> Líder
--   colaborador@exemplo.com  -> Colaborador
--
-- Obs.: se preferir, crie os usuários pela aba Authentication > Users e
-- ajuste os UUIDs abaixo. Este bloco insere direto em auth.users/identities.
-- =====================================================================

-- ---- Usuários de autenticação ---------------------------------------
with novos(id, email, nome, papel_txt) as (
  values
    ('11111111-1111-1111-1111-111111111111'::uuid, 'gerente@exemplo.com', 'Ana Gerente', 'gerente'),
    ('22222222-2222-2222-2222-222222222222'::uuid, 'lider@exemplo.com', 'Bruno Líder', 'lider'),
    ('33333333-3333-3333-3333-333333333333'::uuid, 'colaborador@exemplo.com', 'Carla Colaboradora', 'colaborador')
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', n.id, 'authenticated', 'authenticated',
  n.email, crypt('senha123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object('nome', n.nome, 'role', n.papel_txt),
  now(), now(), '', '', '', ''
from novos n
on conflict (id) do nothing;

-- ---- Identidades (necessário para login por e-mail) -----------------
with novos(id, email) as (
  values
    ('11111111-1111-1111-1111-111111111111'::uuid, 'gerente@exemplo.com'),
    ('22222222-2222-2222-2222-222222222222'::uuid, 'lider@exemplo.com'),
    ('33333333-3333-3333-3333-333333333333'::uuid, 'colaborador@exemplo.com')
)
insert into auth.identities (
  id, provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), n.id::text, n.id,
  jsonb_build_object('sub', n.id::text, 'email', n.email),
  'email', now(), now(), now()
from novos n
on conflict do nothing;

-- ---- Área e ajustes de perfil ---------------------------------------
insert into areas (id, nome, lider_id)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Estratégico', '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

insert into areas (nome) values
  ('Tático'), ('Operacional'), ('Criação'), ('Redes Sociais')
on conflict do nothing;

update profiles set area_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', cargo = 'Gerente de Marketing'
  where id = '11111111-1111-1111-1111-111111111111';
update profiles set area_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', cargo = 'Líder de Conteúdo',
  lider_id = '11111111-1111-1111-1111-111111111111'
  where id = '22222222-2222-2222-2222-222222222222';
update profiles set area_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', cargo = 'Analista de Marketing',
  lider_id = '22222222-2222-2222-2222-222222222222'
  where id = '33333333-3333-3333-3333-333333333333';

-- ---- Chamados de exemplo --------------------------------------------
insert into chamados (titulo, descricao, tipo, categoria, prioridade, status, solicitante_id, responsavel_id, area_id, prazo_sla)
values
  ('Criar lâmina de lançamento do produto X', 'Precisamos de uma lâmina para o e-mail marketing da campanha de julho.',
   'criacao_peca', 'E-mail marketing', 'alta', 'em_andamento',
   '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now() + interval '3 days'),
  ('Revisar post do Instagram', 'Revisão de copy e identidade visual do post agendado.',
   'revisao', 'Redes sociais', 'media', 'aberto',
   '33333333-3333-3333-3333-333333333333', null,
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now() + interval '1 day'),
  ('Aprovar banner do site', 'Banner da home precisa de aprovação final antes de publicar.',
   'aprovacao', 'Site', 'urgente', 'em_triagem',
   '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now() + interval '12 hours')
on conflict do nothing;

-- ---- Tarefa de exemplo (kanban) -------------------------------------
insert into tarefas (titulo, descricao, status, responsavel_id, prazo, ordem)
values
  ('Produzir 3 variações da lâmina', 'Layout claro, escuro e minimalista.', 'em_andamento',
   '33333333-3333-3333-3333-333333333333', now() + interval '2 days', 0)
on conflict do nothing;

-- ---- Plano de ação de exemplo ---------------------------------------
insert into planos_acao (origem_tipo, colaborador_id, autor_id, descricao, resultado_esperado, prazo, status, proxima_conversa)
values
  ('feedback', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222',
   'Aprofundar domínio das ferramentas de design para ganhar autonomia nas entregas.',
   'Entregar as próximas 3 peças sem necessidade de retrabalho.',
   current_date + interval '30 days', 'em_andamento', current_date + interval '30 days')
on conflict do nothing;
