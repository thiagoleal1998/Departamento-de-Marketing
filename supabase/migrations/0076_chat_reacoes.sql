-- =====================================================================
-- 0076 — Chat: reações às mensagens (como no WhatsApp).
-- Cada pessoa tem no máximo uma reação por mensagem: reagir de novo com outro
-- emoji troca, com o mesmo emoji tira. Só quem participa da conversa vê e reage.
-- Pode rodar mais de uma vez.
-- =====================================================================

create table if not exists chat_reacoes (
  mensagem_id uuid not null references chat_mensagens(id) on delete cascade,
  conversa_id uuid not null references chat_conversas(id) on delete cascade,
  usuario_id uuid not null references profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (mensagem_id, usuario_id)
);
create index if not exists chat_reacoes_conversa_idx on chat_reacoes (conversa_id);

alter table chat_reacoes enable row level security;

drop policy if exists "chat_reacoes_select" on chat_reacoes;
create policy "chat_reacoes_select" on chat_reacoes for select using (public.chat_pode_acessar(conversa_id));

drop policy if exists "chat_reacoes_insert" on chat_reacoes;
create policy "chat_reacoes_insert" on chat_reacoes for insert
  with check (usuario_id = auth.uid() and public.chat_pode_acessar(conversa_id));

drop policy if exists "chat_reacoes_update" on chat_reacoes;
create policy "chat_reacoes_update" on chat_reacoes for update
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid() and public.chat_pode_acessar(conversa_id));

drop policy if exists "chat_reacoes_delete" on chat_reacoes;
create policy "chat_reacoes_delete" on chat_reacoes for delete using (usuario_id = auth.uid());

-- Tempo real nas reações.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'chat_reacoes'
  ) then
    alter publication supabase_realtime add table chat_reacoes;
  end if;
end $$;
