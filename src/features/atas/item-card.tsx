"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/shared/link";
import { ChevronDown, ExternalLink, KanbanSquare, MessageCircle, NotebookPen, Pencil, X } from "lucide-react";
import { ItemEditor, type PessoaOpcao } from "./editor-reuniao";
import type { ItemAta } from "./tipos";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ItemCardDados {
  id: string;
  titulo: string;
  prioridade: number | null;
  statusRotulo: string;
  aberto: boolean;
  /** Situação do prazo (só para itens abertos nas pendências). */
  situacao?: { tom: "atrasado" | "proximo" | "ok" | "neutro"; texto: string };
  prazo: string;
  responsavel: string | null;
  vezes?: number;
  detalhamento: string | null;
  plano: string | null;
  link: string | null;
  /** Responsável exibido no detalhe (o resumo já fica sob o nome da pessoa). */
  responsavelDetalhe?: string | null;
}

/** Ações do item nas pendências: abrir a tarefa no quadro, abrir na ata e (liderança) editar ali mesmo. */
export interface AcoesItem {
  tarefaHref: string | null;
  ataHref: string | null;
  /** Abre o chat já falando sobre este item (com o responsável, quando há). */
  chatHref?: string | null;
  editor: { item: ItemAta; reuniaoId: string; pessoas: PessoaOpcao[] } | null;
}

const TOM: Record<string, string> = {
  atrasado: "border-red-300 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  proximo: "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  ok: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  neutro: "border-muted bg-muted text-muted-foreground",
};

/** Item da ata: resumo fechado; ao clicar, abre o card completo no próprio bloco. */
export function ItemCard({ it, acoes, chatHref }: { it: ItemCardDados; acoes?: AcoesItem; chatHref?: string | null }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState(false);

  return (
    <div
      className={cn(
        "border-b last:border-b-0",
        aberto && "bg-accent/30 ring-1 ring-inset ring-primary/30"
      )}
    >
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex w-full items-start gap-2 p-3 text-left transition-colors hover:bg-accent/40"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className={cn("text-sm font-medium leading-tight", !aberto && "line-clamp-2")}>
            {it.prioridade ? (
              <Badge variant="outline" className="mr-1.5 align-middle">
                P{it.prioridade}
              </Badge>
            ) : null}
            {it.titulo}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={it.aberto ? "secondary" : "outline"}>{it.statusRotulo}</Badge>
            {it.situacao ? (
              <span className={cn("rounded border px-1.5 py-0.5 text-[11px]", TOM[it.situacao.tom])}>
                {it.situacao.texto}
              </span>
            ) : null}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Prazo: {it.prazo}
            {it.responsavel ? ` · ${it.responsavel}` : ""}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
            aberto && "rotate-180"
          )}
        />
      </button>

      {aberto ? (
        <div className="space-y-3 px-3 pb-4 text-sm">
          {it.detalhamento ? (
            <div>
              <p className="mb-0.5 text-xs font-medium text-muted-foreground">Detalhamento</p>
              <p className="whitespace-pre-line">{it.detalhamento}</p>
            </div>
          ) : null}
          {it.plano ? (
            <div>
              <p className="mb-0.5 text-xs font-medium text-muted-foreground">Plano de ação</p>
              <p className="whitespace-pre-line">{it.plano}</p>
            </div>
          ) : null}
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Responsável</dt>
            <dd>{it.responsavelDetalhe ?? it.responsavel ?? "—"}</dd>
            <dt className="text-muted-foreground">Prazo</dt>
            <dd>{it.prazo}</dd>
            <dt className="text-muted-foreground">Prioridade</dt>
            <dd>{it.prioridade ?? "—"}</dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd>{it.statusRotulo}</dd>
            {it.vezes && it.vezes > 1 ? (
              <>
                <dt className="text-muted-foreground">Recorrência</dt>
                <dd>Aparece em {it.vezes} reuniões</dd>
              </>
            ) : null}
          </dl>
          {it.link ? (
            <a
              href={it.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <ExternalLink className="size-3.5" /> Abrir link
            </a>
          ) : null}

          {acoes || chatHref ? (
            <div className="flex flex-wrap gap-2 border-t pt-3">
              {acoes?.editor ? (
                <Button type="button" size="sm" variant={editando ? "secondary" : "default"} className="h-8" onClick={() => setEditando((v) => !v)}>
                  {editando ? <X className="size-3.5" /> : <Pencil className="size-3.5" />} {editando ? "Fechar edição" : "Editar"}
                </Button>
              ) : null}
              {acoes?.tarefaHref ? (
                <Button asChild size="sm" variant="outline" className="h-8">
                  <Link href={acoes.tarefaHref}>
                    <KanbanSquare className="size-3.5" /> Abrir tarefa
                  </Link>
                </Button>
              ) : null}
              {acoes?.ataHref ? (
                <Button asChild size="sm" variant="outline" className="h-8">
                  <Link href={acoes.ataHref}>
                    <NotebookPen className="size-3.5" /> Abrir na ata
                  </Link>
                </Button>
              ) : null}
              {chatHref ? (
                <Button asChild size="sm" variant="outline" className="h-8">
                  <Link href={chatHref}>
                    <MessageCircle className="size-3.5" /> Falar no chat
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : null}
          {editando && acoes?.editor ? (
            <ItemEditor it={acoes.editor.item} reuniaoId={acoes.editor.reuniaoId} pessoas={acoes.editor.pessoas} editavel aoSalvo={() => router.refresh()} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
