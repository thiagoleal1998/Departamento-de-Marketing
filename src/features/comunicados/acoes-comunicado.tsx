"use client";

import { useDialogo } from "@/components/shared/dialogo-provider";

import { useTransition } from "react";
import { Pin, PinOff, Trash2 } from "lucide-react";
import { alternarFixado, excluirComunicado } from "./actions";
import { Button } from "@/components/ui/button";

export function AcoesComunicado({
  id,
  fixado,
}: {
  id: string;
  fixado: boolean;
}) {
  const [pendente, startTransition] = useTransition();
  const { confirmar } = useDialogo();

  return (
    <div className="flex shrink-0 gap-1">
      <Button
        variant="ghost"
        size="icon"
        title={fixado ? "Desafixar" : "Fixar no topo"}
        aria-label={fixado ? "Desafixar" : "Fixar no topo"}
        disabled={pendente}
        onClick={() =>
          startTransition(async () => {
            await alternarFixado(id, !fixado);
          })
        }
      >
        {fixado ? <PinOff className="size-4" /> : <Pin className="size-4" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="Excluir"
        aria-label="Excluir comunicado"
        disabled={pendente}
        onClick={async () => {
          const ok = await confirmar({
            titulo: "Excluir este comunicado?",
            descricao: "Ele deixa de aparecer para todo o time.",
            confirmar: "Excluir",
            perigo: true,
          });
          if (!ok) return;
          startTransition(async () => {
            await excluirComunicado(id);
          });
        }}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
