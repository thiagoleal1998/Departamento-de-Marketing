"use client";

import { useState, useTransition } from "react";
import { Check, X, Loader2, Ban } from "lucide-react";
import { cancelarSolicitacao, decidirSolicitacao } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Botão do solicitante para cancelar uma solicitação pendente. */
export function CancelarSolicitacao({ id }: { id: string }) {
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      {erro ? <span className="text-xs text-destructive">{erro}</span> : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pendente}
        onClick={() => {
          if (!confirm("Cancelar esta solicitação?")) return;
          setErro(null);
          startTransition(async () => {
            const res = await cancelarSolicitacao(id);
            if (res.erro) setErro(res.erro);
          });
        }}
      >
        {pendente ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Ban className="size-4" />
        )}
        Cancelar
      </Button>
    </div>
  );
}

/** Aprovar / recusar (somente o gerente), com resposta opcional. */
export function DecidirSolicitacao({ id }: { id: string }) {
  const [resposta, setResposta] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  function decidir(decisao: "aprovada" | "recusada") {
    setErro(null);
    startTransition(async () => {
      const res = await decidirSolicitacao(id, decisao, resposta);
      if (res.erro) setErro(res.erro);
    });
  }

  return (
    <div className="space-y-2 border-t pt-3">
      <Input
        value={resposta}
        onChange={(e) => setResposta(e.target.value)}
        placeholder="Resposta para a pessoa (opcional)"
        aria-label="Resposta"
      />
      <div className="flex flex-wrap items-center justify-end gap-2">
        {erro ? <span className="text-xs text-destructive">{erro}</span> : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pendente}
          onClick={() => decidir("recusada")}
        >
          <X className="size-4" /> Recusar
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={pendente}
          onClick={() => decidir("aprovada")}
        >
          {pendente ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          Aprovar
        </Button>
      </div>
    </div>
  );
}
