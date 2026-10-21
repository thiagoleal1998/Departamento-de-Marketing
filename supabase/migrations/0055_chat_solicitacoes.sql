-- =====================================================================
-- 0055 — Chat: solicitações de criação (landing page, página, banner, lâmina,
-- vídeo, e-mail, arte...) como pedido estruturado, separado das mensagens.
-- Guarda o produto, o link de referência, quem solicitou, o print de prova e o
-- andamento. Print no bucket PRIVADO "chat-solicitacoes" (links assinados).
-- Acesso: quem participa da conversa. Rode DEPOIS da 0054. Pode rodar mais de uma vez.
-- =====================================================================

create table if not exists chat_solicitacoes (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references chat_conversas(id) on delete cascade,
  tipo text not null,
  produto text not null,
  link_referencia text,
  solicitante text not null,
  prazo date,
  detalhes text,
  prova_caminho text,
  prova_nome text,
  status text not null default 'solicitada'
    check (status in ('solicitada', 'em_andamento', 'concluida', 'cancelada')),
  criado_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists chat_solicitacoes_conversa_idx on chat_solicitacoes (conversa_id, created_at desc);

alter table chat_mensagens
  add column if not exists solicitacao_id uuid references chat_solicitacoes(id) on delete set null;

alter table chat_solicitacoes enable row level security;

drop policy if exists "chat_solic_select" on chat_solicitacoes;
create policy "chat_solic_select" on chat_solicitacoes
  for select using (public.chat_pode_acessar(conversa_id));
drop policy if exists "chat_solic_insert" on chat_solicitacoes;
create policy "chat_solic_insert" on chat_solicitacoes
  for insert with check (criado_por = auth.uid() and public.chat_pode_acessar(conversa_id));
drop policy if exists "chat_solic_update" on chat_solicitacoes;
create policy "chat_solic_update" on chat_solicitacoes
  for update using (public.chat_pode_acessar(conversa_id))
  with check (public.chat_pode_acessar(conversa_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-solicitacoes',
  'chat-solicitacoes',
  false,
  10485760, -- 10 MB por arquivo
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = false;
