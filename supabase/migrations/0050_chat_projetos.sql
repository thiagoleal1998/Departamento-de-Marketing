-- =====================================================================
-- 0050 — Chat × Projetos: a mensagem pode citar um projeto e registrar uma
-- atualização nele; o projeto ganha uma linha do tempo de atualizações.
-- Leitura: todos autenticados. Escrita: qualquer autenticado como autor
-- (a mudança de situação do projeto continua só para a liderança).
-- Rode DEPOIS da 0049. Pode rodar mais de uma vez.
-- =====================================================================

alter table chat_mensagens
  add column if not exists projeto_id uuid references projetos(id) on delete set null;

create table if not exists projeto_atualizacoes (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,
  autor_id uuid references profiles(id) on delete set null,
  texto text not null check (length(trim(texto)) > 0 and length(texto) <= 2000),
  status_novo text,
  origem text not null default 'manual',   -- manual | chat
  created_at timestamptz not null default now()
);
create index if not exists projeto_atualizacoes_idx on projeto_atualizacoes (projeto_id, created_at desc);

alter table projeto_atualizacoes enable row level security;

drop policy if exists "proj_atual_select" on projeto_atualizacoes;
create policy "proj_atual_select" on projeto_atualizacoes
  for select using (auth.uid() is not null);
drop policy if exists "proj_atual_insert" on projeto_atualizacoes;
create policy "proj_atual_insert" on projeto_atualizacoes
  for insert with check (autor_id = auth.uid());
drop policy if exists "proj_atual_delete" on projeto_atualizacoes;
create policy "proj_atual_delete" on projeto_atualizacoes
  for delete using (autor_id = auth.uid() or public.eh_gerente());
