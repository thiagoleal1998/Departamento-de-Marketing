import Link from "next/link";
import { KanbanSquare, Ticket } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { mapaDePerfis } from "@/features/chamados/data";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatarData } from "@/lib/utils";
import { TAREFA_STATUS_META, type TarefaStatus } from "@/types";
import type { Tarefa } from "@/types/database";

export const dynamic = "force-dynamic";

const COLUNAS: TarefaStatus[] = [
  "a_fazer",
  "em_andamento",
  "revisao",
  "concluida",
];

export default async function OperacionalPage() {
  await exigirUsuario();
  const supabase = await criarClienteServidor();

  const [{ data: tarefasData }, perfis] = await Promise.all([
    supabase.from("tarefas").select("*").order("ordem", { ascending: true }),
    mapaDePerfis(),
  ]);
  const tarefas = (tarefasData as Tarefa[] | null) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Operacional"
        descricao="Kanban de tarefas da equipe. Tarefas também podem nascer de chamados."
      />

      {tarefas.length === 0 ? (
        <EmptyState
          icone={KanbanSquare}
          titulo="Nenhuma tarefa ainda"
          descricao="Converta um chamado em tarefa para vê-la aparecer aqui no kanban."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUNAS.map((coluna) => {
            const daColuna = tarefas.filter((t) => t.status === coluna);
            return (
              <div key={coluna} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <Badge variant={TAREFA_STATUS_META[coluna].variant}>
                    {TAREFA_STATUS_META[coluna].label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {daColuna.length}
                  </span>
                </div>
                <div className="space-y-2 rounded-lg bg-muted/40 p-2 min-h-24">
                  {daColuna.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-lg border bg-card p-3 shadow-sm"
                    >
                      <p className="text-sm font-medium leading-tight">
                        {t.titulo}
                      </p>
                      {t.descricao ? (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {t.descricao}
                        </p>
                      ) : null}
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {t.responsavel_id
                            ? perfis.get(t.responsavel_id)?.nome ?? "—"
                            : "Sem responsável"}
                        </span>
                        {t.prazo ? <span>{formatarData(t.prazo)}</span> : null}
                      </div>
                      {t.chamado_id ? (
                        <Link
                          href={`/chamados/${t.chamado_id}`}
                          className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Ticket className="size-3" /> Ver chamado de origem
                        </Link>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
