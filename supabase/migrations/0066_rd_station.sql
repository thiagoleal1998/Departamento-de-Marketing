-- =====================================================================
-- 0066 — RD Station Marketing: conexão (OAuth) e e-mails sincronizados.
-- Tokens criptografados (AES-256-GCM) e lidos só pelo servidor.
-- Os números dos e-mails são visíveis só pela liderança. Pode rodar mais de uma vez.
-- =====================================================================

create table if not exists rd_conexao (
  id integer primary key default 1 check (id = 1),
  access_cifrado text not null,
  refresh_cifrado text not null,
  expira_em timestamptz not null,
  conectado_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table rd_conexao enable row level security;
-- Sem policies: nenhum acesso pelo navegador; apenas o servidor (chave de serviço).

create table if not exists rd_emails (
  campaign_id bigint primary key,
  nome text not null,
  enviado_em timestamptz,
  contatos integer,
  entregues integer,
  descartados integer,
  rejeitados integer,
  abertos integer,
  cliques integer,
  descadastros integer,
  spam integer,
  taxa_entrega numeric,
  taxa_abertura numeric,
  taxa_clique numeric,
  taxa_spam numeric,
  atualizado_em timestamptz not null default now()
);

create index if not exists rd_emails_envio_idx on rd_emails (enviado_em desc);

alter table rd_emails enable row level security;
drop policy if exists "rd_emails_lideranca" on rd_emails;
create policy "rd_emails_lideranca" on rd_emails for select using (public.eh_lideranca());

create table if not exists rd_sync (
  id integer primary key default 1 check (id = 1),
  sincronizado_em timestamptz,
  de date,
  ate date,
  emails integer,
  erro text
);

alter table rd_sync enable row level security;
drop policy if exists "rd_sync_lideranca" on rd_sync;
create policy "rd_sync_lideranca" on rd_sync for select using (public.eh_lideranca());
