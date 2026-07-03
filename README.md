# Painel do Departamento de Marketing

Sistema centralizado de **gestão, criação, operação e desenvolvimento** do time de marketing.
Construído com **Next.js 15 (App Router) + TypeScript + Tailwind CSS + Supabase**.

## Módulos desta etapa

- **Autenticação e perfis** — três papéis: Gerente, Líder e Colaborador (RBAC na UI + RLS no banco).
- **Dashboard** — visão geral adaptada ao perfil.
- **Chamados** *(completo)* — abrir, triar, atribuir, comentar, mudar status (fluxo com timeline/SLA) e **converter em tarefa**.
- **Feedbacks e Desenvolvimento** *(completo)* — construtor de feedback guiado (9 etapas), conversas 1:1, planos de ação, geração de roteiro/resumo (impressão/PDF) e histórico por colaborador.
- **Operacional** — kanban de tarefas (incluindo as geradas a partir de chamados).
- **Criação** — gerador de peça com **prévia simulada** (pronto para plugar o Canva) e catálogo de modelos.
- **Gestão** — indicadores e áreas estratégicas (em construção).
- **Configurações** — gestão de usuários, papéis e áreas (Gerente).

## Pré-requisitos

- Node.js 20+ (testado com 24)
- Uma conta no [Supabase](https://supabase.com)

## Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar o Supabase

1. Crie um projeto no Supabase.
2. Em **Project Settings → API**, copie a **Project URL** e a **anon public key**.
3. Copie o arquivo de exemplo e preencha:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
```

### 3. Aplicar o banco de dados

No **SQL Editor** do Supabase, rode na ordem:

1. `supabase/migrations/0001_init.sql` — tabelas, enums, funções, RLS e triggers.
2. `supabase/seed.sql` — dados de exemplo + 3 usuários (senha `senha123`):
   - `gerente@exemplo.com` — Gerente
   - `lider@exemplo.com` — Líder
   - `colaborador@exemplo.com` — Colaborador

> Se preferir, crie os usuários em **Authentication → Users** e ajuste os UUIDs no seed.

### 4. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse http://localhost:3000 e entre com um dos usuários de exemplo.

## Estrutura do projeto

```
src/
├── app/(auth)/login        # tela de login
├── app/(app)/…             # área autenticada (dashboard, chamados, desenvolvimento, etc.)
├── components/ui           # primitivos de UI
├── components/shared       # componentes compartilhados
├── components/layout       # sidebar, topbar, navegação
├── features/…              # lógica por domínio (auth, chamados, desenvolvimento, criacao, configuracoes)
├── lib/                    # supabase, permissões, navegação, utils
└── types/                  # tipos de domínio e do banco
supabase/
├── migrations/0001_init.sql
└── seed.sql
```

## Segurança

O controle de acesso vive em dois níveis:

- **UI/rotas** — `src/lib/permissions.ts` e o middleware.
- **Banco (fonte da verdade)** — **Row Level Security** em todas as tabelas, garantindo, por exemplo, que um colaborador só leia os próprios feedbacks e os chamados que abriu ou recebeu.

## Próximos passos previstos

- Persistência das peças da Área de Criação e integração real com a **Canva Connect API**.
- Campanhas, calendário e relatórios da Área de Gestão.
- Drag-and-drop no kanban e upload de anexos via Supabase Storage.
