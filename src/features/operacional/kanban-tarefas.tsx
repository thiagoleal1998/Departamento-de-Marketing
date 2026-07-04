"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Ticket, GripVertical } from "lucide-react";
import { moverTarefa } from "./actions";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { cn, formatarData } from "@/lib/utils";
import { TAREFA_STATUS_META, type TarefaStatus } from "@/types";
import { KanbanSquare } from "lucide-react";

export interface TarefaView {
  id: string;
  titulo: string;
  descricao: string | null;
  status: TarefaStatus;
  responsavel_nome: string | null;
  chamado_id: string | null;
  prazo: string | null;
}

const COLUNAS: TarefaStatus[] = [
  "a_fazer",
  "em_andamento",
  "revisao",
  "concluida",
];

export function KanbanTarefas({ tarefas }: { tarefas: TarefaView[] }) {
  const [lista, setLista] = useState(tarefas);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<TarefaStatus | null>(null);
  const [, startTransition] = useTransition();

  if (tarefas.length === 0) {
    return (
      <EmptyState
        icone={KanbanSquare}
        titulo="Nenhuma tarefa ainda"
        descricao="Converta um chamado em tarefa para vê-la aparecer aqui no kanban."
      />
    );
  }

  function soltar(status: TarefaStatus) {
    const id = arrastando;
    setArrastando(null);
    setSobre(null);
    if (!id) return;
    const tarefa = lista.find((t) => t.id === id);
    if (!tarefa || tarefa.status === status) return;
    setLista((l) =>
      l.map((t) => (t.id === id ? { ...t, status } : t))
    );
    startTransition(async () => {
      await moverTarefa(id, status);
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {COLUNAS.map((coluna) => {
        const daColuna = lista.filter((t) => t.status === coluna);
        return (
          <div
            key={coluna}
            onDragOver={(e) => {
              e.preventDefault();
              setSobre(coluna);
            }}
            onDragLeave={() => setSobre((s) => (s === coluna ? null : s))}
            onDrop={() => soltar(coluna)}
            className="space-y-3"
          >
            <div className="flex items-center justify-between px-1">
              <Badge variant={TAREFA_STATUS_META[coluna].variant}>
                {TAREFA_STATUS_META[coluna].label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {daColuna.length}
              </span>
            </div>
            <div
              className={cn(
                "min-h-24 space-y-2 rounded-lg border border-transparent bg-muted/40 p-2 transition-colors",
                sobre === coluna && "border-primary/50 bg-primary/5"
              )}
            >
              {daColuna.map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={() => setArrastando(t.id)}
                  onDragEnd={() => setArrastando(null)}
                  className={cn(
                    "group cursor-grab rounded-lg border bg-card p-3 shadow-sm active:cursor-grabbing",
                    arrastando === t.id && "opacity-50"
                  )}
                >
                  <div className="flex items-start gap-1.5">
                    <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">
                        {t.titulo}
                      </p>
                      {t.descricao ? (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {t.descricao}
                        </p>
                      ) : null}
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="truncate">
                          {t.responsavel_nome ?? "Sem responsável"}
                        </span>
                        {t.prazo ? <span>{formatarData(t.prazo)}</span> : null}
                      </div>
                      {t.chamado_id ? (
                        <Link
                          href={`/chamados/${t.chamado_id}`}
                          className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Ticket className="size-3" /> Ver chamado
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
