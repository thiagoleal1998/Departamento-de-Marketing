"use client";

import { useState, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { sincronizarDiscRh, type EstadoSync } from "./discrh-actions";
import { Button } from "@/components/ui/button";

/** Botão do gerente: traz os perfis concluídos da DISC RH. */
export function SincronizarDisc() {
  const [pendente, startTransition] = useTransition();
  const [res, setRes] = useState<EstadoSync | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pendente}
        onClick={() => {
          setRes(null);
          startTransition(async () => setRes(await sincronizarDiscRh()));
        }}
      >
        {pendente ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <RefreshCw className="size-4" />
        )}
        Sincronizar com a DISC RH
      </Button>
      {res?.ok ? (
        <span className="text-sm text-emerald-600">
          {res.novos} novo(s), {res.atualizados} atualizado(s) em {res.pesquisas}{" "}
          pesquisa(s).
        </span>
      ) : null}
      {res?.erro ? (
        <span className="text-sm text-destructive">{res.erro}</span>
      ) : null}
    </div>
  );
}
