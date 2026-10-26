"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { marcarComercialVisto } from "./visto-actions";
import { Button } from "@/components/ui/button";

/** "Já vi": tira o aviso de alterações do Comercial só para quem clicou. */
export function BotaoMarcarVisto() {
  const [pendente, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 border-amber-400 bg-white/60 hover:bg-white dark:bg-transparent"
        disabled={pendente}
        onClick={() =>
          start(async () => {
            setErro(null);
            const r = await marcarComercialVisto();
            if (r.erro) setErro(r.erro);
          })
        }
      >
        {pendente ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Marcar como visto
      </Button>
      {erro ? <span className="text-xs text-destructive">{erro}</span> : null}
    </span>
  );
}
