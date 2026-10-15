"use client";

import { useRef, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, GripVertical, Link2 } from "lucide-react";
import { KanbanSquare } from "lucide-react";
import { moverTarefa } from "./actions";
import { TarefaDetalhe } from "./tarefa-detalhe";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { cn, formatarData } from "@/lib/utils";
import { TAREFA_STATUS_META, type TarefaStatus } from "@/types";

export interface TarefaView {
  id: string;
  titulo: string;
  descricao: string | null;
  status: TarefaStatus;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  responsaveis_notion: string | null;
  /** Destino ao clicar em "abrir origem" (chamado/projeto). */
  origemHref: string | null;
  origemLabel: string | null;
  prazo: string | null;
  prioridade: number | null;
  tag: string | null;
  link: string | null;
  conteudo: string | null;
}

export interface PessoaOpcao {
  id: string;
  nome: string;
}

/** Colunas do quadro (iguais às do Notion). "Em revisão" só aparece se houver cards. */
const COLUNAS: TarefaStatus[] = [
  "a_fazer",
  "em_andamento",
  "alteracoes",
  "aprovacao_gustavo",
  "aprovacao_thiago",
  "aprovacao_marco",
  "concluida",
];

export function KanbanTarefas({
  tarefas,
  pessoas,
}: {
  tarefas: TarefaView[];
  pessoas: PessoaOpcao[];
}) {
  const [lista, setLista] = useState(tarefas);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<TarefaStatus | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const trilho = useRef<HTMLDivElement>(null);

  if (lista.length === 0) {
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
    setLista((l) => l.map((t) => (t.id === id ? { ...t, status } : t)));
    startTransition(async () => {
      await moverTarefa(id, status);
    });
  }

  function rolar(direcao: 1 | -1) {
    trilho.current?.scrollBy({ left: direcao * 320, behavior: "smooth" });
  }

  const colunas: TarefaStatus[] = lista.some((t) => t.status === "revisao")
    ? [...COLUNAS.slice(0, -1), "revisao", "concluida"]
    : COLUNAS;

  const aberto = lista.find((t) => t.id === aberta) ?? null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Clique em um card para abrir e editar. Arraste para mudar de coluna.
        </p>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => rolar(-1)}
            aria-label="Rolar para a esquerda"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => rolar(1)}
            aria-label="Rolar para a direita"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div ref={trilho} className="flex gap-4 overflow-x-auto pb-3">
        {colunas.map((coluna) => {
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
              className="w-72 shrink-0 space-y-3"
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
                  "max-h-[calc(100vh-18rem)] min-h-24 space-y-2 overflow-y-auto rounded-lg border border-transparent bg-muted/40 p-2 transition-colors",
                  sobre === coluna && "border-primary/50 bg-primary/5"
                )}
              >
                {daColuna.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setArrastando(t.id)}
                    onDragEnd={() => setArrastando(null)}
                    onClick={() => setAberta(t.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setAberta(t.id);
                    }}
                    className={cn(
                      "group cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/30",
                      arrastando === t.id && "opacity-50"
                    )}
                  >
                    <div className="flex items-start gap-1.5">
                      <GripVertical className="mt-0.5 size-4 shrink-0 cursor-grab text-muted-foreground/50" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-tight">
                          {t.titulo}
                        </p>
                        {t.descricao ? (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {t.descricao}
                          </p>
                        ) : null}
                        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="truncate">
                            {t.responsavel_nome ?? "Sem responsável"}
                          </span>
                          {t.prazo ? (
                            <span className="shrink-0">
                              {formatarData(t.prazo)}
                            </span>
                          ) : null}
                        </div>
                        {t.link || t.origemHref ? (
                          <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary">
                            <Link2 className="size-3" />
                            {t.origemLabel ?? "Com link"}
                          </span>
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

      {aberto ? (
        <TarefaDetalhe
          key={aberto.id}
          tarefa={aberto}
          pessoas={pessoas}
          onFechar={() => setAberta(null)}
          onSalvo={(t) =>
            setLista((l) => l.map((x) => (x.id === t.id ? t : x)))
          }
        />
      ) : null}
    </div>
  );
}
