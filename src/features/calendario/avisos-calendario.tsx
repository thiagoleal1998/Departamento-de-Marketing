"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Loader2 } from "lucide-react";
import { marcarLida, marcarLidasPorLink } from "@/features/notificacoes/actions";
import { Button } from "@/components/ui/button";

export interface AvisoCalendario {
  id: string;
  titulo: string;
  quando: string;
}

/**
 * O número vermelho do menu "Calendário geral" conta os avisos ainda não vistos (lembretes de itens do calendário).
 * Aqui eles aparecem por extenso; cada um sai da lista (e do número) quando a pessoa marca como visto.
 */
export function AvisosCalendario({ avisos }: { avisos: AvisoCalendario[] }) {
  const router = useRouter();
  const [vistos, setVistos] = useState<Set<string>>(new Set());
  const [pendente, startTransition] = useTransition();
  const lista = avisos.filter((a) => !vistos.has(a.id));
  if (lista.length === 0) return null;

  function ver(id: string) {
    setVistos((v) => new Set(v).add(id));
    startTransition(async () => {
      await marcarLida(id);
      router.refresh();
    });
  }

  function verTodos() {
    setVistos(new Set(avisos.map((a) => a.id)));
    startTransition(async () => {
      await marcarLidasPorLink("/operacional/calendario");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 rounded-lg border-2 border-amber-400 bg-amber-50 p-4 dark:bg-amber-950/40">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
          <Bell className="size-5" />
          {lista.length} aviso{lista.length === 1 ? "" : "s"} do calendário
        </p>
        <span className="text-xs text-amber-900/80 dark:text-amber-200/80">É o número vermelho do menu: lembretes de itens que você pediu para ser avisado.</span>
        <Button type="button" size="sm" variant="outline" className="ml-auto h-8" onClick={verTodos} disabled={pendente}>
          {pendente ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Marcar todos como vistos
        </Button>
      </div>
      <ul className="space-y-1.5 text-sm">
        {lista.map((a) => (
          <li key={a.id} className="flex items-start justify-between gap-3 rounded-md bg-background/70 px-3 py-2">
            <span>
              {a.titulo}
              <span className="ml-2 text-xs text-muted-foreground">recebido em {a.quando}</span>
            </span>
            <button type="button" onClick={() => ver(a.id)} className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10">
              Visto
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
