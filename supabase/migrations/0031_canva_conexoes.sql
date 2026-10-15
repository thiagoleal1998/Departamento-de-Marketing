-- Conexão de cada pessoa com o Canva (OAuth). Tokens criptografados (AES-256-GCM);
-- leitura/escrita feitas apenas no servidor (service role).
create table if not exists canva_conexoes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_cifrado text not null,
  refresh_cifrado text not null,
  expira_em timestamptz not null,
  canva_nome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table canva_conexoes enable row level security;

-- Sem policies: nenhum acesso pelo client; apenas o servidor (service role).
