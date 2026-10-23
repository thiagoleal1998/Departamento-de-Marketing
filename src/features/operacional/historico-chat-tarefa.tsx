"use client";

import { useEffect, useState } from "react";
import Link from "@/components/shared/link";
import { MessagesSquare } from "lucide-react";
import { historicoChatTarefa, type MensagemDaTarefa } from "@/features/chat/vinculos-actions";

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Histórico da conversa do chat que originou (ou citou) a tarefa. */
export function HistoricoChatTarefa({ tarefaId }: { tarefaId: string }) {
  const [dados, setDados] = useState<{ conversaId: string | null; mensagens: MensagemDaTarefa[] } | null>(null);

  useEffect(() => {
    let vivo = true;
    void historicoChatTarefa(tarefaId).then((r) => vivo && setDados(r));
    return () => {
      vivo = false;
    };
  }, [tarefaId]);

  if (!dados || dados.mensagens.length === 0) return null;

  return (
    <section className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <MessagesSquare className="size-4" /> Histórico do chat desta tarefa
        </h3>
        {dados.conversaId ? (
          <Link href={"/chat?c=" + dados.conversaId} className="text-xs font-medium text-primary hover:underline">
            Abrir conversa
          </Link>
        ) : null}
      </div>
      <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {dados.mensagens.map((m) => (
          <li key={m.id} className="rounded-md border bg-background p-2 text-sm">
            <p className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{m.autor}</span>
              <span>{quando(m.quando)}</span>
            </p>
            <p className="mt-0.5 whitespace-pre-wrap break-words">{m.texto}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
