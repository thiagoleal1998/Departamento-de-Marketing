# Painel do Departamento de Marketing

Sistema centralizado de marketing (gestão, criação, operação e desenvolvimento de pessoas).
**Stack:** Next.js 15 (App Router, TypeScript) · Tailwind CSS · Supabase (Postgres, Auth, Storage, RLS).
Interface em **português (pt-BR)**, com tom acolhedor nos módulos de feedback/1:1.

## Convenções obrigatórias

### 1. Atualizar o GitHub automaticamente
Ao concluir **qualquer alteração de código**, sempre publicar no GitHub sem precisar pedir:

```
git add -A
git commit -m "<mensagem clara do que mudou (vX.Y.Z)>

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
git push origin main
```

- Repositório: `https://github.com/thiagoleal1998/Departamento-de-Marketing.git` (branch `main`).
- **NUNCA** commitar segredos: `.env.local` e `.env.vercel-novo` ficam fora do versionamento (`.gitignore`). Apenas `.env.local.example` (com placeholders) é versionado.
- Mensagens de commit em português, descrevendo o que mudou. A linha `Co-Authored-By` usa o modelo em uso (hoje, Claude Sonnet 5.5).

### 2. Subir a versão do sistema a cada atualização
A cada conjunto de mudanças, **incrementar a versão** em `package.json` (campo `version`), seguindo semver:

- **patch** (0.0.x): correções e ajustes pequenos;
- **minor** (0.x.0): novas funcionalidades;
- **major** (x.0.0): mudanças estruturais/incompatíveis.

A versão é fonte única em `package.json`, exposta via `NEXT_PUBLIC_APP_VERSION` (definido em `next.config.mjs`) e exibida no **rodapé da barra lateral**. Sempre incluir o bump de versão no mesmo commit da alteração.

### 3. Publicar (deploy) na Vercel
O painel roda na conta **`marketing-2073`** (Hobby, pessoal) → https://departamento-de-marketing-lv.vercel.app. O push no GitHub **não** publica (deploy automático desligado em `vercel.json`): é preciso publicar pela CLI, depois de commitar e dar push:

```
export VERCEL_TOKEN=$(grep '^VERCEL_TOKEN=' .env.vercel-novo | cut -d= -f2 | tr -d '\r')
npx vercel deploy --prod --yes --scope marketing-2073 --token "$VERCEL_TOKEN"
```

- **Nunca** usar o escopo antigo `people-and-growth` (nem mexer no projeto `people-growth`, que não é deste painel).
- Antes de publicar: `npx tsc --noEmit` e `npx next lint` precisam passar.
- Publicar em lote (uma vez por conjunto de mudanças): o plano Hobby tem limite de CPU. Links internos usam `@/components/shared/link` (prefetch desligado).
- Telas com trabalho lento no servidor (IA, notícias, planilhas) precisam de **limite de tempo por bloco** (`ComLimite`, `src/components/shared/com-limite.tsx`): a função da Vercel morre aos 60 s e o navegador mostra "Connection closed" na tela inteira. Para ver erros de produção: `npx vercel logs --deployment departamento-de-marketing-lv.vercel.app --scope marketing-2073 --token "$VERCEL_TOKEN" --since 10m --query 'level:error'` (o Hobby só guarda logs recentes).
- Se aparecer erro estranho de tela logo após publicar (ex.: `e[o] is not a function`), pode ser cache de build: publicar de novo com `--force`.

### 4. Interface sempre moderna e consistente
- **Nunca** usar `<select>` nativo: usar sempre o componente `Select` (`src/components/ui/select.tsx`).
- Datas de formulário com o seletor de data do projeto quando já existir (`SeletorData`); botões, cards e modais seguem o visual dos módulos existentes (nada "feito nas coxas").

### 5. Datas, prazos e fuso (Brasília)
Todo o painel trabalha no **horário de Brasília (America/Sao_Paulo)**. Regras para não dar prazo diferente em telas diferentes:

- Campo de data (`aaaa-mm-dd`) → ao gravar em coluna `timestamptz` (ex.: `tarefas.prazo`, `chamados.prazo_sla`), usar `prazoParaGravar()` de `src/lib/utils.ts` (grava **meio-dia em Brasília**). Nunca gravar a data pura: o banco usa meia-noite UTC e o prazo "volta" um dia em Brasília.
- Para preencher um campo de data a partir de um valor do banco, usar `diaBrasilia()`; **nunca** `.slice(0, 10)` num timestamp.
- Para mostrar datas, usar `formatarData()` / `formatarDataHora()` (já fixam o fuso, evitando diferença entre servidor e navegador).
- Qualquer `toLocale*String` novo precisa de `timeZone: "America/Sao_Paulo"`.

### 6. Migrations e dados
- O usuário **roda as migrations manualmente** no SQL Editor do Supabase. Ao criar uma migration (próximo número em `supabase/migrations/`), avisar claramente que ela precisa ser rodada e deixar o código **degradar sem erro** enquanto a tabela/coluna não existir (códigos `42P01`, `42703`, `PGRST204`, `PGRST205`).
- Ajustes de dados em massa só com **backup** dos valores originais (arquivo no scratchpad) e dizendo ao usuário o que foi alterado.
- Verificar dados do banco com a service role (REST) a partir do `.env.local`; a service role **nunca** vai para o client.

## Comandos

- `npm run dev` — desenvolvimento (http://localhost:3000)
- `npm run build` — build de produção (valida tipos)
- `npx tsc --noEmit` — checagem rápida de tipos
- `npx next lint` — lint

> No Windows, se o `.next` corromper (erro `routes-manifest.json`), pare o node, apague `.next` e rode `npm run dev` de novo.
> Não há Python no computador: scripts de apoio em Node (`.mjs`/`tsx`) no scratchpad.

## Banco de dados (Supabase)

- Schema versionado em `supabase/migrations/` + `supabase/seed.sql`.
- Segurança em dois níveis: **RLS no banco** (fonte da verdade) + RBAC na UI (`src/lib/permissions.ts`).
- A **service role key** só pode ser usada no servidor (`src/lib/supabase/admin.ts`) — nunca no client.
- Arquivos: buckets públicos `referencias` (peças em revisão) e `chat-anexos` (imagens/áudios do chat).

## Organização

- `src/app/(app)/…` — área autenticada; `src/app/(auth)/login` — login; `src/app/page.tsx` — portal público; `src/app/(auth)/contatos` — contatos públicos (ordem pela hierarquia de cargos).
- `src/features/<domínio>/` — lógica por domínio (chamados, chat, comercial, atas, calendario, operacional, desenvolvimento, criacao, configuracoes, perfil, portal…).
- `src/lib/` — supabase, permissões, config (marca), navegação, utils (datas/fuso).
- Arquivos `"use server"` exportam **só funções assíncronas**: tipos e constantes ficam em arquivos separados.
- Arquitetura modular e preparada para expansão.

## Módulos com regras próprias

### Comercial (`src/features/comercial/`)
- Fonte: planilha do Comercial (Google Sheets, `PLANILHA_ID` em `tipos.ts`), lida como `.xlsx`. **Linhas e colunas ocultas na planilha são ignoradas de propósito** (produto oculto = fora do sistema).
- Sincroniza por: botão "Sincronizar agora", crons (dias úteis, ver `vercel.json`) e aviso do Apps Script da planilha (`/api/comercial/sync`).
- **Períodos sazonais** (aba "Períodos sazonais"): uma planilha por campanha, listada em `PERIODOS_SAZONAIS` (`sazonal-tipos.ts`). Hoje: **Black November 2026**. Lida junto com a sincronização do Comercial e também ao abrir a tela (se a última leitura tem mais de 10 min). Tabelas `comercial_sazonal` e `comercial_sazonal_sync` (migration 0083). Hotel que muda ganha destaque e aviso no sino. As condições da campanha também aparecem nos **cards normais** dos produtos (ligação pelo nome do hotel, `hotelCombina`).
- **LPs sem produto na planilha** (cadastro em Operacional > Landing Pages, grupos novas/b2c/v4) ganham card próprio na aba do seu destino/situação (ex.: LP nacional inativa → NACIONAL INATIVAS), com a faixa "Só no cadastro de LPs". Epic Pages, antigas e a aba "Controle Feriados" da planilha de LPs **não** entram.
- Conferência com as LPs compara a planilha com `landing_pages.status_patrocinio`.

### Chat (`src/features/chat/`)
- Mensagens em tempo real (Supabase Realtime), reações, confirmação de leitura (`chat_leituras`), envio de imagem/áudio, caixa estilo WhatsApp.
- **Revisão de peças**: menu "Revisão" → Solicitar revisão / Revisar peça (marcações sobre a imagem, com zoom/mover).
- **Falar sobre algo**: menu do clipe → "Tarefa ou tópico da ata"; Ata e item do Calendário têm o botão "Falar no chat" (abre conversa com o responsável, sem redirecionar). Vínculo com estoque/tarefa/projeto continua em "Estoque ou tarefa".
- **Som de notificação** (`som.ts`): toca **uma vez por mensagem recebida** (nunca ao enviar), deduplicado por id da mensagem; sem intervalo mínimo que descarte mensagens. O aviso do navegador sai em silêncio quando o painel está aberto (o próprio painel toca `public/sons/notificacao.mp3`).

### Atas (`src/features/atas/`)
- Pendências vêm da última ata, com o andamento real da tarefa ligada (`vivo.ts`). Itens têm "Falar no chat".

### Senhas (Operacional)
- Cada pessoa edita/exclui as senhas que cadastrou; o gerente mexe em todas. Filtro: ativos/antigos → usuário (Redes sociais e Outras não são usuários).

## Memória do projeto
Decisões duradouras (IA = Google Gemini grátis; conta Vercel nova; UI moderna) ficam na memória do Claude Code do projeto, não aqui.
