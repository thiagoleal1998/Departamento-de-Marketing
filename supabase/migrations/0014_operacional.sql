-- =====================================================================
-- 0014 — Operacional: landing pages, conteúdos do site, controle de
-- conteúdo das LPs e cofre de senhas. Rode DEPOIS das anteriores.
-- =====================================================================

create table if not exists landing_pages (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  url text,
  objetivo text,
  responsavel_id uuid references profiles(id) on delete set null,
  status text not null default 'rascunho'
    check (status in ('rascunho', 'no_ar', 'pausada', 'encerrada')),
  observacoes text,
  criado_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists conteudos_site (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  pagina_url text,
  tipo text not null default 'texto'
    check (tipo in ('texto', 'banner', 'blog', 'imagem', 'outro')),
  responsavel_id uuid references profiles(id) on delete set null,
  status text not null default 'a_fazer'
    check (status in ('a_fazer', 'em_producao', 'em_revisao', 'publicado')),
  prazo date,
  observacoes text,
  criado_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists lp_conteudos (
  id uuid primary key default gen_random_uuid(),
  landing_page_id uuid not null references landing_pages(id) on delete cascade,
  elemento text not null,
  conteudo text,
  versao text,
  alterado_por uuid references profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists lp_conteudos_lp_idx on lp_conteudos (landing_page_id);

-- Senhas ficam CRIPTOGRAFADAS (AES-256-GCM, feito no servidor do app).
create table if not exists senhas_acesso (
  id uuid primary key default gen_random_uuid(),
  servico text not null,
  url text,
  usuario text,
  senha_cifrada text,
  observacoes text,
  criado_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table landing_pages enable row level security;
alter table conteudos_site enable row level security;
alter table lp_conteudos enable row level security;
alter table senhas_acesso enable row level security;

-- Landing pages: todos veem e editam; liderança exclui.
drop policy if exists "landing_pages_select" on landing_pages;
create policy "landing_pages_select" on landing_pages
  for select using (auth.uid() is not null);
drop policy if exists "landing_pages_insert" on landing_pages;
create policy "landing_pages_insert" on landing_pages
  for insert with check (auth.uid() is not null);
drop policy if exists "landing_pages_update" on landing_pages;
create policy "landing_pages_update" on landing_pages
  for update using (auth.uid() is not null) with check (auth.uid() is not null);
drop policy if exists "landing_pages_delete" on landing_pages;
create policy "landing_pages_delete" on landing_pages
  for delete using (public.eh_lideranca());

-- Conteúdos do site: idem.
drop policy if exists "conteudos_site_select" on conteudos_site;
create policy "conteudos_site_select" on conteudos_site
  for select using (auth.uid() is not null);
drop policy if exists "conteudos_site_insert" on conteudos_site;
create policy "conteudos_site_insert" on conteudos_site
  for insert with check (auth.uid() is not null);
drop policy if exists "conteudos_site_update" on conteudos_site;
create policy "conteudos_site_update" on conteudos_site
  for update using (auth.uid() is not null) with check (auth.uid() is not null);
drop policy if exists "conteudos_site_delete" on conteudos_site;
create policy "conteudos_site_delete" on conteudos_site
  for delete using (public.eh_lideranca());

-- Controle de conteúdo das LPs: idem.
drop policy if exists "lp_conteudos_select" on lp_conteudos;
create policy "lp_conteudos_select" on lp_conteudos
  for select using (auth.uid() is not null);
drop policy if exists "lp_conteudos_insert" on lp_conteudos;
create policy "lp_conteudos_insert" on lp_conteudos
  for insert with check (auth.uid() is not null);
drop policy if exists "lp_conteudos_update" on lp_conteudos;
create policy "lp_conteudos_update" on lp_conteudos
  for update using (auth.uid() is not null) with check (auth.uid() is not null);
drop policy if exists "lp_conteudos_delete" on lp_conteudos;
create policy "lp_conteudos_delete" on lp_conteudos
  for delete using (public.eh_lideranca());

-- Senhas: todos veem a lista (valores cifrados); só gerente grava.
drop policy if exists "senhas_select" on senhas_acesso;
create policy "senhas_select" on senhas_acesso
  for select using (auth.uid() is not null);
drop policy if exists "senhas_write" on senhas_acesso;
create policy "senhas_write" on senhas_acesso for all
  using (public.eh_gerente()) with check (public.eh_gerente());
