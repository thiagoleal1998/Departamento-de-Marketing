"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { alterarStatusChamado } from "./actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CHAMADO_STATUS_FLUXO,
  CHAMADO_STATUS_META,
  type ChamadoStatus,
} from "@/types";

export function PainelStatus({
  chamadoId,
  statusAtual,
  podeEditar,
}: {
  chamadoId: string;
  statusAtual: ChamadoStatus;
  podeEditar: boolean;
}) {
  const [pendente, startTransition] = useTransition();

  function mudar(status: ChamadoStatus) {
    startTransition(async () => {
      await alterarStatusChamado(chamadoId, status);
    });
  }

  return (
    <div className="space-y-2">
      {CHAMADO_STATUS_FLUXO.map((status) => {
        const atual = status === statusAtual;
        return (
          <Button
            key={status}
            type="button"
            variant={atual ? "default" : "outline"}
            size="sm"
            disabled={!podeEditar || pendente || atual}
            onClick={() => mudar(status)}
            className={cn("w-full justify-start", atual && "pointer-events-none")}
          >
            {pendente ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {CHAMADO_STATUS_META[status].label}
          </Button>
        );
      })}
      {!podeEditar ? (
        <p className="text-xs text-muted-foreground">
          Apenas liderança ou o responsável podem alterar o status.
        </p>
      ) : null}
    </div>
  );
}
