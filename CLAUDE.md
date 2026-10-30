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

#### Documentação junto com a versão (obrigatório, em TODA versão)
Toda vez que a versão sobe, **atualize `README.md` e `CLAUDE.md` no mesmo commit**. Os dois não podem ficar para trás:

1. **README.md**: acrescente a linha da versão em "Histórico de versões" (agrupe patches da mesma série); se mudou módulo, tela, migration, variável de ambiente, rotina automática ou forma de publicar, atualize as tabelas correspondentes (Módulos, Migrations mais recentes, Variáveis, Rotinas).
2. **CLAUDE.md**: registre regras novas, decisões, módulos novos ou alterados (seção "Módulos com regras próprias"), armadilhas encontradas e a migration nova (número e o que cria).
3. Antes do `git commit`, confira com `git status` que `README.md` e `CLAUDE.md` estão entre os arquivos alterados. Se uma versão for só um ajuste mínimo, ao menos a linha no Histórico de versões do README entra.
4. Ao terminar, diga ao usuário que a documentação foi atualizada.

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
> Ao editar código por script Node, **nunca** coloque expressões regulares dentro de template literal sem `String.raw` (as barras de `\d` e `\s` somem em silêncio e o código compila do mesmo jeito). Prefira a ferramenta de edição de arquivo e, depois, teste a função com `npx tsx`.

## Migrations recentes (o usuário roda no SQL Editor)
| Nº | O que cria |
|---|---|
| 0080 | Senhas: edição/exclusão pelo criador |
| 0081 · 0082 | Chat: leitura e revisão de peças; imagens e áudios (bucket `chat-anexos`) |
| 0083 | `comercial_sazonal`, `comercial_sazonal_sync` |
| 0084 | `profiles.nome_exibicao` |
| 0085 | `proc_macroprocessos`, `proc_processos`, `proc_fluxos`, `proc_historico` + 7 macroprocessos e o processo de exemplo |
| 0086 | `tarefas.solicitante` |
| 0087 | `tarefa_historico` |

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
- **Status das LPs** (v1.63.0): a planilha `1ghnypK1Pyaz3c-eEClk3FC9xfb-tIKb1P0hivodzf3g` não era sincronizada depois da importação inicial (causa do Tauá João Pessoa inativo). `lps-planilha.ts` lê Novas/B2C/V4/Feriados; `lps-sync.ts` atualiza só `status_patrocinio` das LPs existentes, por grupo + URL normalizada ou nome exato. Não aproxima hotéis, não altera linhas ausentes/conflitantes, não cria/exclui LPs nem muda outros campos. Roda junto com o Comercial (manual, webhook e crons); backup do valor anterior no histórico antes da gravação, atualização condicional para evitar concorrência, lote de 4. Falhas de LPs aparecem no resultado/botão e em `comercial_sync.erro` sem interromper os produtos comerciais. Requer histórico 0057/0058; sem ele a LP não é alterada. Sem migration nova.
- Fonte: planilha do Comercial (Google Sheets, `PLANILHA_ID` em `tipos.ts`), lida como `.xlsx`. **Linhas e colunas ocultas na planilha são ignoradas de propósito** (produto oculto = fora do sistema).
- Sincroniza por: botão "Sincronizar agora", crons (dias úteis, ver `vercel.json`) e aviso do Apps Script da planilha (`/api/comercial/sync`).
- **Períodos sazonais** (aba "Períodos sazonais"): uma planilha por campanha, listada em `PERIODOS_SAZONAIS` (`sazonal-tipos.ts`). Hoje: **Black November 2026**. Lida junto com a sincronização do Comercial e também ao abrir a tela (se a última leitura tem mais de 10 min). Tabelas `comercial_sazonal` e `comercial_sazonal_sync` (migration 0083). Hotel que muda ganha destaque e aviso no sino. As condições da campanha também aparecem nos **cards normais** dos produtos (ligação pelo nome do hotel, `hotelCombina`).
- **LPs sem produto na planilha** (cadastro em Operacional > Landing Pages, grupos novas/b2c/v4) ganham card próprio na aba do seu destino/situação (ex.: LP nacional inativa → NACIONAL INATIVAS), com a faixa "Só no cadastro de LPs". Epic Pages, antigas e a aba "Controle Feriados" da planilha de LPs **não** entram.
- Conferência com as LPs compara a planilha com `landing_pages.status_patrocinio`.
- **Busca geral** (`busca-geral.tsx`): caixa acima das abas que procura em **todas** as abas (produtos, cadastro de LPs e hotéis dos períodos sazonais), por nome e pelo conteúdo das condições; ao escolher, abre a aba e o card (`?aba=…&abrir=<chave>`).

### Chat (`src/features/chat/`)
- **Prints por Ctrl+V** (v1.61.0): `colagem.ts` extrai imagens reais da área de transferência; os campos de mensagem dos chats completo e flutuante chamam `AnexoEnvio.colarImagem`, que abre a prévia existente (legenda e envio manual). Colagem de texto segue normal; não baixar imagens de HTML copiado. Mesmos formatos, redução e limite de 15 MB do envio por arquivo. Não substitui anexo enquanto envia ou grava áudio. Chat flutuante reinicia o anexo ao mudar de conversa. Sem migration nova (usa 0082).
- Mensagens em tempo real (Supabase Realtime), reações, confirmação de leitura (`chat_leituras`), envio de imagem/áudio, caixa estilo WhatsApp.
- **Revisão de peças**: menu "Revisão" → Solicitar revisão / Revisar peça (marcações sobre a imagem, com zoom/mover).
- **Falar sobre algo**: menu do clipe → "Tarefa ou tópico da ata"; Ata e item do Calendário têm o botão "Falar no chat" (abre conversa com o responsável, sem redirecionar). Vínculo com estoque/tarefa/projeto continua em "Estoque ou tarefa".
- **Troca instantânea de conversa** (`chat-agora.tsx`): a página do Chat carrega uma vez e cada clique só busca as mensagens da conversa (ação `mensagensDaConversa`), com cache e pré-busca ao passar o mouse; o endereço muda por `history.replaceState`. Não use redirecionamento de servidor para abrir conversa (causou erro de tela). `marcarConversaLida` **não** faz `revalidatePath`.
- **Não lidas ao vivo** (`contagem-chat.ts`, `ouvinte-chat.tsx`): um "quadro" no navegador mantém o total e o número por conversa; o menu, o ícone do topo e a lista do chat leem dele e se atualizam quando chega mensagem.
- **Busca na conversa** (`busca-actions.ts`) por trecho e/ou dia, "Ver mensagens anteriores", abre direto na última mensagem. **Links** nas mensagens ficam clicáveis (`texto-com-links.tsx`).
- **Nome de exibição**: cada pessoa define "como quer ser chamado(a)" no perfil (`profiles.nome_exibicao`, migration 0084); o chat usa esse nome (`features/equipe/exibicao.ts`). Foto de perfil na lista e no cabeçalho.
- **Som de notificação** (`som.ts`): toca **uma vez por mensagem recebida** (nunca ao enviar), deduplicado por id da mensagem; sem intervalo mínimo que descarte mensagens. O aviso do navegador sai em silêncio quando o painel está aberto (o próprio painel toca `public/sons/notificacao.mp3`).

### Fluxos e processos (Gestão > aba "Fluxos e processos", `src/features/processos/`)
- Hierarquia: Departamento → Macroprocessos (`proc_macroprocessos`, editáveis) → Processos (`proc_processos`, código MKT-<SIGLA>-001) → Fluxos (`proc_fluxos`: JSON `{nodes, edges}`; `dados` = rascunho de trabalho, `publicado` = última versão em vigor) → Etapas (nós do fluxo). Histórico em `proc_historico`. Migration 0085.
- **Processo ≠ tarefa**: o processo é o modelo permanente; as tarefas do quadro são execuções. Não misturar.
- Editor visual com React Flow (`@xyflow/react`, `editor-fluxo.tsx`): blocos Início/Atividade/Decisão/Aprovação/Documento/Processo vinculado/Fim, ligações com "Sim/Não", desfazer/refazer, salvamento automático, painel da etapa. Visões do mesmo dado: fluxograma, lista de etapas, por responsável. Fluxo **atual** × **proposto** (melhorias ainda não implantadas).
- Regras de qualidade (`validacao.ts`): para **publicar**, o processo tem objetivo, entrega final e dono; toda atividade tem responsável; toda aprovação tem critério; toda decisão tem ≥2 caminhos com nome; o fluxo tem Início e Fim. **Rascunhos incompletos podem ser salvos.** Editar um processo publicado o põe "em revisão" e a versão publicada continua a vigente. Revisão periódica a cada 6 meses.
- Escrita só da liderança (RLS `eh_lideranca()`); leitura para todo usuário logado (quem só lê vê a versão publicada). Fases futuras: biblioteca de procedimentos e anexos (2), permissões Administrador/Gestor/Editor/Leitor e aprovação de mudanças (3), exportação PNG/PDF, modelos e relatórios (4).

### Relatórios (`src/features/relatorios/`)
- Abas: Divulgação, E-mails (RD Station), **Evolução do operacional** e Acessos e atividade. Em **toda aba** há o bloco "Como apuramos estes dados" (`como-apuramos.tsx`): **ao criar ou mudar um número de relatório, atualize o texto de fontes e fórmulas dessa aba**.
- Evolução do operacional (`operacional.ts`, `relatorio-operacional.tsx`): tarefas do quadro + atas. Gráficos próprios em SVG (`graficos.tsx`, sem biblioteca; paleta de dados validada). Seções: leitura rápida, indicadores, evolução, **quem solicita** (filtro de mês, `quem-solicita.tsx`), pontos de correção (aprovação de quem, motivos de adiamento das atas e das tarefas, atrasadas por pessoa).
- Limite conhecido: as tarefas guardam a data de criação, **não** a de conclusão; o tempo real de entrega por tarefa ainda não é medido.

### Gestão (`src/app/(app)/gestao/`)
- Abas (`gestao-abas.tsx`): Indicadores, Fluxos e processos, Perfis comportamentais, Férias, Escala de feriados.
- **Indicadores** são dos **chamados** (Central de Solicitações) e a tela diz isso; o tempo médio de resolução usa a data real da conclusão (histórico) e informa quantos chamados entram.
- **Escala de feriados**: diretoria e gerência (cargo com "Diretor" ou "Gerente") ficam fora da estatística (`features/feriados/participantes.ts`).

### Dashboard
- Notícias (`noticias/rss.ts`): procurar fotos no resumo e em `content:encoded` do RSS; ignorar banners publicitários (`al-banner`) e scripts antes de extrair imagens. A Revista Hotéis envia fotos editoriais no conteúdo completo. Correção v1.60.2, sem migration.
- Turismo (v1.60.3): algumas matérias, como a de Pomerode/Família Lima, não trazem foto nem em `content:encoded`. Após selecionar as notícias, `completarImagens` busca as capas ausentes na página (`og:image`, Twitter ou `wp-post-image`), em paralelo, com timeout de 5 s por página, dentro do cache de 15 min. Não buscar páginas de todos os itens do feed nem usar a primeira imagem arbitrária do HTML (pode ser publicidade). Sem migration.
- Blocos lentos (agenda, alertas de destinos, divulgação, painel da liderança, calendário, notícias) usam `ComLimite` (limite de tempo) e, ao estourar, tentam de novo sozinhos até 3 vezes (`AvisoDemora`). Os dias dos alertas de destinos são lidos em paralelo.

### Desenvolvimento e Contatos
- Planos de ação podem ser **excluídos** pelo gerente ou por quem os criou (`excluirPlano`; sem regra de exclusão no banco, a permissão é conferida no servidor).
- Contatos públicos: ordem pela hierarquia do cargo (Diretor → Gerente → Coordenador → Supervisor → Líder → Analista → Assistente → Auxiliar → Estagiário).
- Marca (`nome-marca.tsx`): "DEPARTAMENTO DE MARKETING" em destaque e "Litoral Verde Operadora" abaixo, sem corte.

### Tarefas (Operacional)
- **Obrigatórios na criação manual** (v1.64.0): `validacao-criacao.ts` exige responsável, solicitante não vazio, prazo com data real e prioridade inteira entre 1 e 5 no Novo card e na Server Action. Solicitante é gravado junto com a tarefa (sem fallback que criava sem ele; ausência da migration 0086 mostra aviso). Responsável precisa estar ativo. Duplicação só cria cópia se a origem tiver esses dados; completar e salvar a origem antes. Não há alteração retroativa de tarefas antigas nem mudança nos fluxos automáticos de chamados/atas/projetos/chat. Sem migration nova.
- v1.63.0: manter **Excluir tarefa** à esquerda no rodapé, ao lado das demais ações, e calcular sua visibilidade por `lideranca || responsavel_id === usuarioId` no quadro, acompanhando o responsável atual. Duplicar não substitui Excluir.
- **Duplicar tarefa** (v1.62.0): botão no detalhe copia os campos salvos e conteúdo para uma tarefa independente em `a_fazer`, título com `(cópia)`, novo código/data/histórico. Exige salvar edições antes. Origem lida sob RLS; liderança mantém o responsável, demais usuários ficam responsáveis pela cópia (mesma regra de criação de cards). Preserva prazo como timestamp e copia apenas colunas opcionais presentes. Não copia anexos, conversas, estoque ou vínculos de chamado/projeto/etapa/ata/Notion. Abre a cópia no quadro. Sem migration.
- **Solicitante**: campo de lista (nomes do organograma da Litoral Verde, em `src/features/operacional/solicitantes.ts`) no card e no novo card. Para atualizar o organograma (entradas, saídas, cargos), edite essa lista. Coluna `tarefas.solicitante` (migration 0086).
- **Linha do tempo do card** (`tarefa_historico`, migration 0087): status, prazo, responsável, colaborador, solicitante, prioridade e título geram registros (`src/features/operacional/historico.ts`). **Adiar o prazo** de uma tarefa que já tinha prazo exige **motivo** da lista (`MOTIVOS_PRAZO`, os mesmos das atas) e uma observação opcional; a validação é no servidor (`salvarTarefa`). Os adiamentos e motivos alimentam Relatórios → Evolução do operacional. Mudanças de prazo feitas por outros caminhos (ex.: sincronização com a ata) ainda não são registradas.
- **Solicitante** inclui as reuniões (de vendas, de Marketing, V4, MKT <> Grupos/Inter/COM) no topo da lista; elas formam a área "Reuniões" nos relatórios.
- Campos de data usam sempre `InputData` / `SeletorData` (calendário do painel), nunca `<input type="date">`.

### Atas (`src/features/atas/`)
- Pendências vêm da última ata, com o andamento real da tarefa ligada (`vivo.ts`). Itens têm "Falar no chat".

### Senhas (Operacional)
- Cada pessoa edita/exclui as senhas que cadastrou; o gerente mexe em todas. Filtro: ativos/antigos → usuário (Redes sociais e Outras não são usuários).

## Memória do projeto
Decisões duradouras (IA = Google Gemini grátis; conta Vercel nova; UI moderna) ficam na memória do Claude Code do projeto, não aqui.
