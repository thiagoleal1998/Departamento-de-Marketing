"use client";

import { useState, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useDialogo } from "@/components/shared/dialogo-provider";
import { atualizarDaPlanilha } from "./actions";
import { Button } from "@/components/ui/button";

/** Botão (liderança) para buscar a planilha agora, fora do horário automático das 10:30. */
export function AtualizarPlanilha({ ultima }: { ultima: string | null }) {
  const { avisar } = useDialogo();
  const [pendente, start] = useTransition();
  const [info, setInfo] = useState<string | null>(null);

  const quando = (iso: string) =>
    new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-muted-foreground lg:inline">
        {info ?? (ultima ? `Planilha lida em ${quando(ultima)}` : "Planilha: leitura diária às 10:30")}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={pendente}
        onClick={() =>
          start(async () => {
            const r = await atualizarDaPlanilha();
            if (r.erro) void avisar(r.erro, "Não foi possível atualizar");
            else setInfo(`Atualizado: ${r.inseridas} nova(s), ${r.atualizadas} alterada(s), ${r.removidas} removida(s)`);
          })
        }
      >
        {pendente ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Atualizar da planilha
      </Button>
    </div>
  );
}
