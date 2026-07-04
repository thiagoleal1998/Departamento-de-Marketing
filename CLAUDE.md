# Painel do Departamento de Marketing

Sistema centralizado de marketing (gestão, criação, operação e desenvolvimento de pessoas).
**Stack:** Next.js 15 (App Router, TypeScript) · Tailwind CSS · Supabase (Postgres, Auth, Storage, RLS).
Interface em **português (pt-BR)**, com tom acolhedor nos módulos de feedback/1:1.

## Convenções obrigatórias

### 1. Atualizar o GitHub automaticamente
Ao concluir **qualquer alteração de código**, sempre publicar no GitHub sem precisar pedir:

```
git add -A
git commit -m "<mensagem clara do que mudou>

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push origin main
```

- Repositório: `https://github.com/thiagoleal1998/Departamento-de-Marketing.git` (branch `main`).
- **NUNCA** commitar segredos: `.env.local` está no `.gitignore` e deve permanecer fora do versionamento. Apenas `.env.local.example` (com placeholders) é versionado.
- Mensagens de commit em português, descrevendo o que mudou.

### 2. Subir a versão do sistema a cada atualização
A cada conjunto de mudanças, **incrementar a versão** em `package.json` (campo `version`), seguindo semver:

- **patch** (0.0.x): correções e ajustes pequenos;
- **minor** (0.x.0): novas funcionalidades;
- **major** (x.0.0): mudanças estruturais/incompatíveis.

A versão é fonte única em `package.json`, exposta via `NEXT_PUBLIC_APP_VERSION` (definido em `next.config.mjs`) e exibida no **rodapé da barra lateral**. Sempre incluir o bump de versão no mesmo commit da alteração.

## Comandos

- `npm run dev` — desenvolvimento (http://localhost:3000)
- `npm run build` — build de produção (valida tipos)
- `npx tsc --noEmit` — checagem rápida de tipos

> No Windows, se o `.next` corromper (erro `routes-manifest.json`), pare o node, apague `.next` e rode `npm run dev` de novo.

## Banco de dados (Supabase)

- Schema versionado em `supabase/migrations/` + `supabase/seed.sql`.
- Migrations podem ser aplicadas via **Supabase MCP** (`apply_migration`/`execute_sql`) ou manualmente no SQL Editor.
- Segurança em dois níveis: **RLS no banco** (fonte da verdade) + RBAC na UI (`src/lib/permissions.ts`).
- A **service role key** só pode ser usada no servidor (`src/lib/supabase/admin.ts`) — nunca no client.

## Organização

- `src/app/(app)/…` — área autenticada; `src/app/(auth)/login` — login; `src/app/page.tsx` — portal público.
- `src/features/<domínio>/` — lógica por domínio (chamados, desenvolvimento, criacao, configuracoes, perfil, portal).
- `src/lib/` — supabase, permissões, config (marca), navegação, utils.
- Arquitetura modular e preparada para expansão.
