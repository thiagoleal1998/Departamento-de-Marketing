import Link from "@/components/shared/link";

import {
  AlertTriangle,
  CalendarClock,
  Boxes,
  CheckCircle2,
  FileText,
  FolderKanban,
  LayoutTemplate,
  Lightbulb,
  ListChecks,
  Ticket,
  Clock,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { criarClienteServidor } from "@/lib/supabase/server";
import { DataCard } from "@/components/shared/data-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatarData } from "@/lib/utils";

type Supabase = Awaited<ReturnType<typeof criarClienteServidor>>;

/** Conta registros de forma tolerante (tabela ausente => 0). */
async function contar(
  consulta: PromiseLike<{ count: number | null; error: unknown }>
): Promise<number> {
  try {
    const { count } = await consulta;
    return count ?? 0;
  } catch {
    return 0;
  }
}

interface ItemAlerta {
  titulo: string;
  qtd: number;
  href: string;
  icone: LucideIcon;
  descricao: string;
}

interface ItemEstoque {
  id: string;
  nome: string;
  cor: string | null;
  quantidade: number;
  estoque_minimo: number;
  ignorar_alerta?: boolean;
}

interface TarefaAtrasada {
  id: string;
  titulo: string;
  prazo: string;
  status: string;
}

async function carregar(supabase: Supabase) {
  const hoje = new Date().toISOString().slice(0, 10);
  const head = { count: "exact" as const, head: true };

  const [
    chamadosTriagem,
    chamadosVencidos,
    tarefasPendentes,
    tarefasAtrasadas,
    feedbacksNovos,
    feedbacksAbertos,
    lpsAtivas,
    lpsTotal,
    conteudosPendentes,
    projetosAndamento,
    solicitacoesPendentes,
  ] = await Promise.all([
    contar(
      supabase
        .from("chamados")
        .select("id", head)
        .in("status", ["aberto", "em_triagem"])
    ),
    contar(
      supabase
        .from("chamados")
        .select("id", head)
        .not("status", "in", "(resolvido,fechado)")
        .lt("prazo_entrega", hoje)
    ),
    contar(
      supabase.from("tarefas").select("id", head).neq("status", "concluida")
    ),
    contar(
      supabase
        .from("tarefas")
        .select("id", head)
        .neq("status", "concluida")
        .lt("prazo", hoje)
    ),
    contar(
      supabase.from("sugestoes").select("id", head).eq("status", "nova")
    ),
    contar(
      supabase
        .from("sugestoes")
        .select("id", head)
        .in("status", ["nova", "em_analise"])
    ),
    contar(
      supabase
        .from("landing_pages")
        .select("id", head)
        .eq("status_patrocinio", "ativo")
    ),
    contar(supabase.from("landing_pages").select("id", head)),
    contar(
      supabase
        .from("conteudos_site")
        .select("id", head)
        .neq("status", "publicado")
    ),
    contar(
      supabase
        .from("projetos")
        .select("id", head)
        .in("status", ["planejamento", "em_andamento"])
    ),
    contar(
      supabase
        .from("solicitacoes")
        .select("id", head)
        .eq("status", "pendente")
    ),
  ]);

  // Estoque: compara quantidade x mínimo no servidor (pequeno volume).
  let estoqueBaixo: ItemEstoque[] = [];
  try {
    const comColuna = await supabase
      .from("estoque_itens")
      .select("id, nome, cor, quantidade, estoque_minimo, ignorar_alerta")
      .eq("ativo", true);
    let itens = comColuna.data as ItemEstoque[] | null;
    if (comColuna.error) {
      // Antes da migration 0062 a coluna ignorar_alerta não existe.
      const semColuna = await supabase.from("estoque_itens").select("id, nome, cor, quantidade, estoque_minimo").eq("ativo", true);
      itens = semColuna.data as ItemEstoque[] | null;
    }
    estoqueBaixo = (itens ?? [])
      .filter((i) => i.quantidade <= i.estoque_minimo && !i.ignorar_alerta)
      .sort((a, b) => a.quantidade - b.quantidade);
  } catch {
    estoqueBaixo = [];
  }

  let atrasadas: TarefaAtrasada[] = [];
  try {
    const { data } = await supabase
      .from("tarefas")
      .select("id, titulo, prazo, status")
      .neq("status", "concluida")
      .lt("prazo", hoje)
      .order("prazo", { ascending: true })
      .limit(5);
    atrasadas = (data as TarefaAtrasada[] | null) ?? [];
  } catch {
    atrasadas = [];
  }

  return {
    chamadosTriagem,
    chamadosVencidos,
    tarefasPendentes,
    tarefasAtrasadas,
    feedbacksNovos,
    feedbacksAbertos,
    lpsAtivas,
    lpsTotal,
    conteudosPendentes,
    projetosAndamento,
    solicitacoesPendentes,
    estoqueBaixo,
    atrasadas,
  };
}

/** Painel de gestão exibido no dashboard de gerentes e líderes. */
export async function PainelLideranca() {
  const supabase = await criarClienteServidor();
  const d = await carregar(supabase);

  const alertas: ItemAlerta[] = [
    {
      titulo: "Chamados para triar",
      qtd: d.chamadosTriagem,
      href: "/chamados?situacao=triagem",
      icone: Ticket,
      descricao: "Abertos ou em triagem",
    },
    {
      titulo: "Chamados com prazo vencido",
      qtd: d.chamadosVencidos,
      href: "/chamados?situacao=vencidos",
      icone: Clock,
      descricao: "Passaram da data de entrega",
    },
    {
      titulo: "Tarefas atrasadas",
      qtd: d.tarefasAtrasadas,
      href: "/operacional?filtro=atrasadas",
      icone: ListChecks,
      descricao: "Prazo vencido e não concluídas",
    },
    {
      titulo: "Solicitações pendentes",
      qtd: d.solicitacoesPendentes,
      href: "/solicitacoes",
      icone: CalendarClock,
      descricao: "Folga, férias e ajustes aguardando decisão",
    },
    {
      titulo: "Feedbacks novos",
      qtd: d.feedbacksNovos,
      href: "/sugestoes?aba=acompanhar&visao=kanban",
      icone: Lightbulb,
      descricao: "Aguardando sua análise",
    },
    {
      titulo: "Estoque baixo ou zerado",
      qtd: d.estoqueBaixo.length,
      href: "/estoque?filtro=baixo",
      icone: Boxes,
      descricao: "Itens para repor",
    },
  ].filter((a) => a.qtd > 0);

  return (
    <div className="space-y-6">
      {/* Atenção */}
      <Card className={alertas.length > 0 ? "border-amber-300" : undefined}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {alertas.length > 0 ? (
              <AlertTriangle className="size-5 text-amber-600" />
            ) : (
              <CheckCircle2 className="size-5 text-emerald-600" />
            )}
            Precisa da sua atenção
          </CardTitle>
          <CardDescription>
            {alertas.length > 0
              ? "Pendências que merecem uma olhada agora."
              : "Tudo em dia por aqui. Nenhuma pendência no momento."}
          </CardDescription>
        </CardHeader>
        {alertas.length > 0 ? (
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {alertas.map((a) => {
                const Icone = a.icone;
                return (
                  <li key={a.titulo}>
                    <Link
                      href={a.href}
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/40"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                        <Icone className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-tight">
                          {a.titulo}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {a.descricao}
                        </span>
                      </span>
                      <span className="text-xl font-semibold">{a.qtd}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        ) : null}
      </Card>

      {/* Indicadores */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DataCard
          titulo="LPs ativas"
          valor={d.lpsAtivas}
          icone={LayoutTemplate}
          descricao={`de ${d.lpsTotal} cadastradas`}
          href="/operacional/landing-pages"
        />
        <DataCard
          titulo="Tarefas pendentes"
          valor={d.tarefasPendentes}
          icone={ListChecks}
          descricao={
            d.tarefasAtrasadas > 0
              ? `${d.tarefasAtrasadas} atrasada(s)`
              : "Nenhuma atrasada"
          }
          href="/operacional"
        />
        <DataCard
          titulo="Feedbacks pendentes"
          valor={d.feedbacksAbertos}
          icone={Lightbulb}
          descricao={`${d.feedbacksNovos} novo(s) sem análise`}
          href="/sugestoes"
        />
        <DataCard
          titulo="Estoque para repor"
          valor={d.estoqueBaixo.length}
          icone={Boxes}
          descricao="Itens no mínimo ou zerados"
          href="/estoque"
        />
        <DataCard
          titulo="Conteúdos do site pendentes"
          valor={d.conteudosPendentes}
          icone={FileText}
          descricao="A fazer, em produção ou revisão"
          href="/operacional/conteudos-site"
        />
        <DataCard
          titulo="Projetos em curso"
          valor={d.projetosAndamento}
          icone={FolderKanban}
          descricao="Planejamento ou andamento"
          href="/projetos"
        />
      </div>

      {/* Listas */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Estoque para repor</CardTitle>
              <CardDescription>Itens no mínimo ou zerados</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/estoque">
                Ver estoque <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {d.estoqueBaixo.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhum item abaixo do mínimo. 👍
              </p>
            ) : (
              <ul className="divide-y">
                {d.estoqueBaixo.slice(0, 6).map((i) => (
                  <li
                    key={i.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {i.nome}
                      {i.cor ? (
                        <span className="text-muted-foreground"> · {i.cor}</span>
                      ) : null}
                    </span>
                    <span
                      className={
                        i.quantidade === 0
                          ? "shrink-0 font-semibold text-destructive"
                          : "shrink-0 font-semibold text-amber-600"
                      }
                    >
                      {i.quantidade} un.
                      {i.estoque_minimo > 0 ? (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          (mín. {i.estoque_minimo})
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Tarefas atrasadas</CardTitle>
              <CardDescription>Prazo vencido e ainda não concluídas</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/operacional?filtro=atrasadas">
                Ver tarefas <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {d.atrasadas.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhuma tarefa atrasada. 👍
              </p>
            ) : (
              <ul className="divide-y">
                {d.atrasadas.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <Link href={`/operacional?tarefa=${t.id}`} className="min-w-0 truncate hover:underline">
                      {t.titulo}
                    </Link>
                    <span className="shrink-0 text-xs text-destructive">
                      venceu em {formatarData(t.prazo)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
