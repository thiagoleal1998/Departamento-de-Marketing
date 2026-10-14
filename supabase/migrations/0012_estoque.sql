-- =====================================================================
-- 0012 — Estoque (brindes, flyers, banners) com entradas e saídas
-- Rode DEPOIS das anteriores.
-- =====================================================================

create table if not exists estoque_itens (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text not null default 'brinde', -- brinde|flyer|banner|outro
  local text,
  quantidade int not null default 0 check (quantidade >= 0),
  estoque_minimo int not null default 0 check (estoque_minimo >= 0),
  foto_url text,
  ativo boolean not null default true,
  criado_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists estoque_movimentos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references estoque_itens(id) on delete cascade,
  tipo text not null check (tipo in ('entrada', 'saida')),
  quantidade int not null check (quantidade > 0),
  saldo_apos int not null,
  motivo text,
  chamado_id uuid references chamados(id) on delete set null,
  projeto_id uuid references projetos(id) on delete set null,
  usuario_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists estoque_mov_item_idx on estoque_movimentos (item_id, created_at desc);

alter table estoque_itens enable row level security;
alter table estoque_movimentos enable row level security;

-- Todos autenticados veem; só gerente cadastra/edita itens.
drop policy if exists "estoque_itens_select" on estoque_itens;
create policy "estoque_itens_select" on estoque_itens
  for select using (auth.uid() is not null);
drop policy if exists "estoque_itens_write" on estoque_itens;
create policy "estoque_itens_write" on estoque_itens for all
  using (public.eh_gerente()) with check (public.eh_gerente());

-- Movimentos: leitura para todos; gravação somente pela função abaixo.
drop policy if exists "estoque_mov_select" on estoque_movimentos;
create policy "estoque_mov_select" on estoque_movimentos
  for select using (auth.uid() is not null);

-- Registra entrada/saída de forma atômica (qualquer usuário autenticado).
create or replace function public.registrar_movimento_estoque(
  p_item uuid,
  p_tipo text,
  p_quantidade int,
  p_motivo text default null,
  p_chamado uuid default null,
  p_projeto uuid default null
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_saldo int;
begin
  if auth.uid() is null then
    raise exception 'Sessão expirada.';
  end if;
  if p_tipo not in ('entrada', 'saida') then
    raise exception 'Tipo de movimentação inválido.';
  end if;
  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'Informe uma quantidade maior que zero.';
  end if;

  select quantidade into v_saldo
  from estoque_itens where id = p_item and ativo for update;
  if not found then
    raise exception 'Item não encontrado.';
  end if;

  if p_tipo = 'saida' then
    if p_quantidade > v_saldo then
      raise exception 'Estoque insuficiente (disponível: %).', v_saldo;
    end if;
    v_saldo := v_saldo - p_quantidade;
  else
    v_saldo := v_saldo + p_quantidade;
  end if;

  update estoque_itens set quantidade = v_saldo where id = p_item;

  insert into estoque_movimentos
    (item_id, tipo, quantidade, saldo_apos, motivo, chamado_id, projeto_id, usuario_id)
  values
    (p_item, p_tipo, p_quantidade, v_saldo, nullif(trim(p_motivo), ''),
     p_chamado, p_projeto, auth.uid());

  return v_saldo;
end;
$$;

grant execute on function public.registrar_movimento_estoque(uuid, text, int, text, uuid, uuid)
  to authenticated;
