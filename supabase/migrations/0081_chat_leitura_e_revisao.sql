-- =====================================================================
-- 0081 — Chat: confirmação de leitura por mensagem e revisão de peças.
--  • chat_leituras: quem leu cada mensagem e quando (aparece como "Lida 14:32" no balão).
--  • chat_mensagens.revisao: a peça enviada para revisão (imagem + apontamentos marcados).
-- Pode rodar mais de uma vez.
-- =====================================================================

create table if not exists chat_leituras (
  mensagem_id uuid not null references chat_mensagens(id) on delete cascade,
  conversa_id uuid not null references chat_conversas(id) on delete cascade,
  usuario_id uuid not null references profiles(id) on delete cascade,
  lida_em timestamptz not null default now(),
  primary key (mensagem_id, usuario_id)
);
create index if not exists chat_leituras_conversa_idx on chat_leituras (conversa_id);

alter table chat_leituras enable row level security;

drop policy if exists "chat_leituras_select" on chat_leituras;
create policy "chat_leituras_select" on chat_leituras for select using (public.chat_pode_acessar(conversa_id));

drop policy if exists "chat_leituras_insert" on chat_leituras;
create policy "chat_leituras_insert" on chat_leituras for insert
  with check (usuario_id = auth.uid() and public.chat_pode_acessar(conversa_id));

-- Mensagens que já foram lidas antes desta migration: usa o horário da última leitura da pessoa.
insert into chat_leituras (mensagem_id, conversa_id, usuario_id, lida_em)
select m.id, m.conversa_id, cm.usuario_id, cm.ultima_leitura
from chat_mensagens m
join chat_membros cm on cm.conversa_id = m.conversa_id
where cm.usuario_id <> m.autor_id and m.created_at <= cm.ultima_leitura
on conflict do nothing;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'chat_leituras'
  ) then
    alter publication supabase_realtime add table chat_leituras;
  end if;
end $$;

-- Revisão de peça: { "imagem": url, "nome": "...", "veredito": "ajustes"|"aprovada",
--                    "marcacoes": [{ "n": 1, "x": 12.5, "y": 8, "w": 30, "h": 20, "texto": "..." }] }
-- (x, y, w, h em % da imagem)
alter table chat_mensagens add column if not exists revisao jsonb;
