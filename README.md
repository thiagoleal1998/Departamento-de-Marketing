# Painel do Departamento de Marketing

Sistema centralizado do Marketing da **Litoral Verde Operadora**: gestão, criação, operação, comercial, comunicação interna e desenvolvimento de pessoas, num só lugar.
Construído com **Next.js 15 (App Router) + TypeScript + Tailwind CSS + Supabase** (Postgres, Auth, Storage, Realtime e RLS). Interface em **português (pt-BR)**.

- **Produção:** https://departamento-de-marketing-lv.vercel.app
- **Repositório:** https://github.com/thiagoleal1998/Departamento-de-Marketing
- **Versão atual:** a do campo `version` do `package.json` (aparece também no rodapé do menu lateral)

> **Regra de manutenção:** a cada versão publicada, atualize este README (módulos, migrations, variáveis, rotinas e **Histórico de versões**) e o `CLAUDE.md`. Veja [Convenções do projeto](#convenções-do-projeto).

---

## Módulos

### Área pública (sem login)
| Endereço | O que é |
|---|---|
| `/` | Portal: atalhos para a Central de Solicitações, Consulta de LPs e Contatos |
| `/central` · `/acompanhar` | Central de Solicitações: pedir arte, campanha, vídeo ou página e acompanhar cada pedido pelo número |
| `/consulta` | Consulta pública de landing pages |
| `/contatos` | Contatos do Marketing, ordenados pela hierarquia dos cargos |

### Área autenticada (menu lateral)
| Módulo | O que faz |
|---|---|
| **Dashboard** | Resumo do dia: agenda, alertas de destinos (notícias de risco), divulgação do dia, painel da liderança, calendário do mês e notícias do turismo/economia. Fotos do turismo ausentes no RSS são buscadas nos metadados da matéria. Cada bloco lento tem limite de tempo próprio |
| **Visão geral** | Resumo para o celular e aprovações da diretoria |
| **Chamados** | Abrir, triar, atribuir, comentar e acompanhar solicitações (SLA, histórico de status, conversão em tarefa) |
| **Feedbacks e Desenvolvimento** | Construtor de feedback guiado com IA, conversas 1:1, planos de ação (com objetivos, checklist, anexos e exclusão), histórico por colaborador |
| **Criação** | Gerador de peças (integração Canva) e catálogo de modelos |
| **Gestão** | Abas: **Indicadores** (chamados e escala de feriados), **Fluxos e processos**, **Perfis comportamentais**, **Férias** e **Escala de feriados** |
| **Relatórios** | Abas: **Divulgação**, **E-mails (RD Station)**, **Evolução do operacional** (gráficos, leitura rápida, pontos de correção, quem solicita, motivos de adiamento) e **Acessos e atividade**. Cada aba tem o bloco "Como apuramos estes dados" |
| **Operacional** | **Tarefas** (kanban, solicitante, motivo ao adiar prazo, linha do tempo do card), Landing Pages, Conteúdos do site, Controle de conteúdo das LPs, **Calendário geral**, Divulgação diária e Senhas (cofre criptografado) |
| **Projetos** | Eventos, feiras, famtours, projetos de Marketing e VTs, com etapas, documentos, comparativos, capa e logo do parceiro; cada projeto também vira card em Tarefas |
| **Atas** | Reuniões de planejamento: pendências por responsável, prazos, adiamentos e frequência; botão **Falar no chat** em cada item |
| **Comercial** | Condições e disponibilidades dos produtos (lidas da planilha oficial), **Períodos sazonais** (Black November 2026), conferência com as LPs, LPs sem produto na planilha e **busca geral** em todas as abas |
| **Chat** | Salas e conversas diretas em tempo real: não lidas ao vivo, confirmação de leitura, reações, imagem e áudio, revisão de peças com marcações, falar sobre tarefa/tópico da ata, busca por termo ou data, links clicáveis, som de notificação |
| **Documentos · Estoque · Comunicados · Solicitações · Sugestões** | Planilhas e modelos; brindes, flyers e banners; avisos para o time; folga, férias e ajustes de horário; relatos, ideias e elogios |
| **Configurações · Perfil** | Usuários, papéis e áreas (gerente); perfil pessoal com foto e "como quero ser chamado(a)" |

**Papéis:** Gerente, Líder e Colaborador (RBAC na interface + RLS no banco).

---

## Integrações

| Serviço | Para quê |
|---|---|
| **Google Sheets** (leitura por exportação) | Planilha do Comercial, Divulgação diária e planilha da Black November |
| **RD Station Marketing** | Estatísticas de e-mails (relatório de e-mails) |
| **Canva Connect** | Peças da Área de Criação |
| **Google Gemini** (plano gratuito) | Assistente de feedback e leitura dos destinos das ofertas |
| **Web Push** | Notificações do navegador (chat, avisos) |
| **Resend** *(opcional)* | E-mail do resumo semanal da diretoria |
| **DISC RH** | Perfis comportamentais |

## Rotinas automáticas (crons da Vercel, em UTC → Brasília)

| Rotina | Quando (Brasília) |
|---|---|
| Resumo semanal da diretoria | segunda, 08h |
| Cobrança diária das atas | dias úteis, 08h |
| Sincronização do Comercial (e Períodos sazonais) | dias úteis, 10h30, 14h, 16h e 19h |
| Divulgação diária | todo dia, 10h30 |
| E-mails do RD Station | todo dia, 08h |
| Lembretes de tarefas e do calendário | todo dia, 08h |

---

## Pré-requisitos

- Node.js 20+ (testado com 24)
- Uma conta no [Supabase](https://supabase.com) e uma conta na [Vercel](https://vercel.com)

## Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Variáveis de ambiente

Copie `.env.local.example` para `.env.local` e preencha. **Nunca** versione o `.env.local` nem o `.env.vercel-novo`.

| Variável | Obrigatória | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sim | Conexão com o Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | sim | Gravações administrativas **somente no servidor** |
| `SENHAS_CHAVE` | sim | Chave AES-256 (64 hex) do cofre de senhas — não pode mudar depois de usada |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | sim | Notificações push |
| `CRON_SECRET` | sim | Autoriza as rotinas automáticas |
| `COMERCIAL_SYNC_SECRET` | sim | Aviso do Apps Script da planilha do Comercial |
| `GEMINI_API_KEY` | opcional | IA (sem ela, o assistente mostra um aviso) |
| `CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET` | opcional | Integração Canva |
| `DISCRH_API_KEY` | opcional | Perfis comportamentais |
| `RESEND_API_KEY`, `EMAIL_REMETENTE` | opcional | E-mail do resumo semanal |

### 3. Banco de dados

No **SQL Editor** do Supabase, rode **em ordem numérica** todos os arquivos de `supabase/migrations/` (`0001_init.sql` até a mais recente) e, se for um ambiente novo, `supabase/seed.sql`.
As migrations podem ser repetidas sem problema. O código foi feito para **continuar funcionando se uma migration recente ainda não tiver sido rodada** (o recurso novo só mostra um aviso).

Migrations mais recentes:

| Nº | O que cria |
|---|---|
| 0080 | Senhas: cada pessoa edita/exclui as que cadastrou |
| 0081 · 0082 | Chat: confirmação de leitura, revisão de peças; imagens e áudios (bucket `chat-anexos`) |
| 0083 | Comercial: Períodos sazonais (`comercial_sazonal`, `comercial_sazonal_sync`) |
| 0084 | Perfil: `nome_exibicao` ("como quero ser chamado(a)") |
| 0085 | Gestão: Fluxos e processos (`proc_*`) com os 7 macroprocessos e um processo de exemplo |
| 0086 | Tarefas: coluna `solicitante` |
| 0087 | Tarefas: histórico (`tarefa_historico`), base da linha do tempo e dos motivos de adiamento |

### 4. Rodar em desenvolvimento

```bash
npm run dev      # http://localhost:3000
```

Outros comandos: `npm run build` (valida tipos), `npx tsc --noEmit`, `npx next lint`.
No Windows, se o `.next` corromper (erro `routes-manifest.json`), pare o node, apague `.next` e rode de novo.

## Publicação (Vercel)

O deploy automático está **desligado**: publica-se pela CLI, depois do commit e do push, na conta `marketing-2073`:

```bash
npx tsc --noEmit && npx next lint
export VERCEL_TOKEN=$(grep '^VERCEL_TOKEN=' .env.vercel-novo | cut -d= -f2 | tr -d '\r')
npx vercel deploy --prod --yes --scope marketing-2073 --token "$VERCEL_TOKEN"
```

---

## Estrutura do projeto

```
src/
├── app/(auth)/        # login e telas públicas (central, acompanhar, consulta, contatos)
├── app/(app)/         # área autenticada (um diretório por módulo)
├── app/api/           # callbacks (Canva, RD) e rotinas automáticas (cron)
├── components/ui      # primitivos (Select, SeletorData/InputData, Avatar, zoom-pan…)
├── components/shared  # componentes compartilhados (ComLimite, Link, DataCard…)
├── components/layout  # menu lateral, barra superior, navegação móvel
├── features/<domínio> # lógica por domínio: chat, comercial, atas, operacional, relatorios, processos…
├── lib/               # supabase, permissões, navegação, utils (datas e fuso), config
└── types/             # tipos de domínio e do banco
supabase/
├── migrations/        # 0001 … mais recente
└── seed.sql
```

## Segurança

- **Dois níveis:** regras de acesso na interface (`src/lib/permissions.ts`) e **Row Level Security** em todas as tabelas (fonte da verdade).
- A **service role key** só existe no servidor (`src/lib/supabase/admin.ts`), nunca no navegador.
- Senhas do cofre são criptografadas (AES-256) com `SENHAS_CHAVE`.
- Segredos nunca entram no Git (`.env.local`, `.env.vercel-novo` no `.gitignore`).

## Convenções do projeto

1. **Commit e push** a cada conjunto de alterações; mensagem em português com a versão, terminando com a linha `Co-Authored-By`.
2. **Versão** em `package.json` a cada mudança: patch (correção), minor (funcionalidade), major (estrutural).
3. **README e CLAUDE.md atualizados a cada versão**: módulos novos, migrations, variáveis de ambiente, rotinas, regras do projeto e uma linha no Histórico de versões abaixo. Vão no mesmo commit da alteração.
4. Datas no fuso de Brasília; use `InputData`/`SeletorData` (nunca `<input type="date">`) e o componente `Select` (nunca `<select>` nativo).
5. As migrations são rodadas manualmente no Supabase; o código deve degradar sem erro enquanto uma migration não foi rodada.

Detalhes e regras de cada módulo ficam no [`CLAUDE.md`](CLAUDE.md).

---

## Histórico de versões

| Versão | O que mudou |
|---|---|
| **1.60.3** | Notícias do turismo: busca alternativa da foto de capa na página da matéria quando o RSS não contém imagem, com timeout de 5 s e cache de 15 min |
| **1.60.2** | Notícias: fotos editoriais também são extraídas do conteúdo completo do RSS, ignorando banners de publicidade; cache do turismo renovado |
| **1.60.1** | Documentação: README reescrito (módulos, integrações, rotinas, variáveis, migrations, publicação) e CLAUDE.md atualizado; passa a ser regra atualizar os dois a cada versão |
| **1.60** | Tarefas: motivo obrigatório ao adiar o prazo (lista), linha do tempo no card, adiamentos nos relatórios (migration 0087) |
| **1.59** | Solicitante: reuniões na lista; relatório "Quem solicita" com filtro e gráfico por mês |
| **1.58** | Relatórios: quem solicita por pessoa e por área |
| **1.57** | Tarefas: campo Solicitante com a lista do organograma (migration 0086) |
| **1.56** | Todos os campos de data usam o calendário do painel |
| **1.55** | Relatórios: bloco "Como apuramos estes dados" em cada aba; nome da marca sem corte |
| **1.54** | Desenvolvimento: excluir planos de ação; fotos nos cards; Gestão deixa claro que os indicadores são dos chamados; Marco e Jonas fora da estatística de feriados; Relatórios mostra de quem é cada aprovação |
| **1.53** | Comercial: busca geral em todas as abas; Chat: links clicáveis; Contatos: supervisor acima de líder |
| **1.52** | Gestão: aba **Fluxos e processos** (fase 1: painel, catálogo, macroprocessos, cadastro, editor visual, pendências e histórico, migration 0085); Projetos: salvar mostra o resultado e o motivo de falha; correção das datas puras (um dia a menos) e reparo de prazos |
| **1.51** | Relatórios: aba **Evolução do operacional** |
| **1.50** | Chat: troca instantânea de conversa |
| **1.49** | Perfil: "como quero ser chamado(a)" (migration 0084); chat com não lidas ao vivo; Tela inicial com limite de tempo por bloco e nova tentativa automática |
| **1.48** | Calendário: avisos explicados; Chat: abre no fim, busca e mensagens anteriores, foto dos usuários; Ata: escolher com quem falar |
| **1.47** | Comercial: LPs sem produto ganham card; prazos de todas as telas no mesmo dia (fuso de Brasília); som do chat uma vez por mensagem |
| **1.46** | Comercial: **Períodos sazonais** (Black November 2026) e condições da Black nos cards (migration 0083) |
| **1.44 – 1.45** | Chat e Ata/Calendário: falar no chat sobre tarefa, tópico da ata ou item do calendário |
| **1.43** | Chat: zoom e marcações na revisão de peças; som só ao receber; Contatos pela hierarquia dos cargos |
| **1.40 – 1.42** | Chat: revisão de peças, confirmação de leitura, imagem e áudio, caixa estilo WhatsApp (migrations 0081 e 0082); caixas de seleção modernas |
| **1.38 – 1.39** | Senhas: filtro por usuário, ativos/antigos, cada pessoa edita as suas (migration 0080) |
| **1.29 – 1.37** | Projetos com card em Tarefas (migration 0078), capa e logo (0079), calendário com projetos, painel com notícias do turismo e economia, página pública de contatos |
| **< 1.29** | Autenticação e perfis, Chamados, Feedbacks e Desenvolvimento, Operacional (kanban), Criação, Atas, Comercial, Estoque, Documentos, Comunicados, Solicitações, Relatórios de divulgação, Chat inicial, notificações push |

## Próximos passos

- **Fluxos e processos:** biblioteca de procedimentos e anexos (fase 2), perfis Administrador/Gestor/Editor/Leitor e aprovação de mudanças (fase 3), exportação PNG/PDF e modelos (fase 4).
- **Tarefas:** registrar a data de conclusão para medir o tempo real de entrega.
- **Comercial:** replicar o bloco "Como apuramos" e a busca geral nas demais telas de dados.
