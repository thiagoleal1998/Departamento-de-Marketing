-- =====================================================================
-- 0063 — Estoque: fornecedores, cotações de preço por produto, compras
-- (quem foi contratado) e nota fiscal. Visível e editável só pela
-- liderança (gerente e líder). Pode rodar mais de uma vez.
-- =====================================================================

create table if not exists fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  contato_nome text,
  telefone text,
  email text,
  site text,
  cnpj text,
  observacoes text,
  ativo boolean not null default true,
  criado_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists estoque_cotacoes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references estoque_itens(id) on delete cascade,
  fornecedor_id uuid not null references fornecedores(id) on delete restrict,
  data_cotacao date not null default current_date,
  valor_unitario numeric(12,2) not null check (valor_unitario >= 0),
  quantidade integer check (quantidade is null or quantidade > 0),
  prazo_entrega_dias integer check (prazo_entrega_dias is null or prazo_entrega_dias >= 0),
  condicoes text,                       -- pagamento, frete, validade da proposta...
  observacao text,
  -- Contratação / compra
  contratado boolean not null default false,
  data_compra date,
  valor_total_pago numeric(12,2) check (valor_total_pago is null or valor_total_pago >= 0),
  nota_fiscal_numero text,
  nota_fiscal_caminho text,             -- arquivo da NF no bucket estoque-notas
  nota_fiscal_nome text,
  criado_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists estoque_cotacoes_item_idx on estoque_cotacoes (item_id, data_cotacao desc);
create index if not exists estoque_cotacoes_forn_idx on estoque_cotacoes (fornecedor_id);

alter table fornecedores enable row level security;
alter table estoque_cotacoes enable row level security;

drop policy if exists "fornecedores_lideranca" on fornecedores;
create policy "fornecedores_lideranca" on fornecedores
  for all using (public.eh_lideranca()) with check (public.eh_lideranca());

drop policy if exists "cotacoes_lideranca" on estoque_cotacoes;
create policy "cotacoes_lideranca" on estoque_cotacoes
  for all using (public.eh_lideranca()) with check (public.eh_lideranca());

-- Notas fiscais num bucket privado (links temporários gerados pelo servidor).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'estoque-notas',
  'estoque-notas',
  false,
  15728640, -- 15 MB por arquivo
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/xml', 'application/xml']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = false;
