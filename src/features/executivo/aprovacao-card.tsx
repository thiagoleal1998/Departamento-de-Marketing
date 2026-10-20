"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, ExternalLink, Loader2, MessageSquareWarning } from "lucide-react";
import { decidirAprovacao } from "./actions";
import type { ItemAprovacao } from "./data";
import { useDialogo } from "@/components/shared/dialogo-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const dataBr = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }) : null;

/** Cartão de uma tarefa aguardando a aprovação: dois botões grandes (aprovar / pedir alteração). */
export function AprovacaoCard({ item, podeDecidir }: { item: ItemAprovacao; podeDecidir: boolean }) {
  const router = useRouter();
  const { confirmar } = useDialogo();
  const [pedindo, setPedindo] = useState(false);
  const [nota, setNota] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, start] = useTransition();

  async function aprovar() {
    const ok = await confirmar({
      titulo: "Aprovar esta tarefa?",
      descricao: item.titulo + "\n\nEla vai para Concluído e o responsável é avisado.",
      confirmar: "Aprovar",
    });
    if (!ok) return;
    setErro(null);
    start(async () => {
      const r = await decidirAprovacao(item.id, "aprovar", "");
      if (r.erro) setErro(r.erro);
      else router.refresh();
    });
  }

  function pedirAlteracao() {
    setErro(null);
    start(async () => {
      const r = await decidirAprovacao(item.id, "alterar", nota);
      if (r.erro) setErro(r.erro);
      else router.refresh();
    });
  }

  return (
    <li className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="space-y-1">
        <p className="text-base font-semibold leading-snug">{item.titulo}</p>
        <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
          {item.responsavel ? <span>Responsável: {item.responsavel}</span> : null}
          {item.prazo ? (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3" /> prazo {dataBr(item.prazo)}
            </span>
          ) : null}
        </p>
        {item.descricao ? <p className="line-clamp-4 whitespace-pre-line text-sm text-foreground/80">{item.descricao}</p> : null}
        {item.link ? (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <ExternalLink className="size-4" /> Abrir material
          </a>
        ) : null}
      </div>

      {podeDecidir ? (
        pedindo ? (
          <div className="space-y-2">
            <Textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="O que precisa ser alterado?"
              className="min-h-[90px]"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className="h-12" onClick={() => setPedindo(false)}>
                Voltar
              </Button>
              <Button type="button" className="h-12" onClick={pedirAlteracao} disabled={pendente || !nota.trim()}>
                {pendente ? <Loader2 className="size-4 animate-spin" /> : null} Enviar
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="h-12 text-base" onClick={() => setPedindo(true)} disabled={pendente}>
              <MessageSquareWarning className="size-5" /> Alterar
            </Button>
            <Button type="button" className="h-12 bg-emerald-600 text-base text-white hover:bg-emerald-700" onClick={aprovar} disabled={pendente}>
              {pendente ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />} Aprovar
            </Button>
          </div>
        )
      ) : null}
      {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
    </li>
  );
}
