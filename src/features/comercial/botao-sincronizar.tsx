"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { sincronizarAgora, type EstadoSync } from "./actions";
import { Button } from "@/components/ui/button";

export function BotaoSincronizar() {
  const router = useRouter();
  const [pendente, start] = useTransition();
  const [res, setRes] = useState<EstadoSync | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pendente}
        onClick={() => {
          setRes(null);
          start(async () => {
            const r = await sincronizarAgora();
            setRes(r);
            if (r.ok) router.refresh();
          });
        }}
      >
        {pendente ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        Sincronizar agora
      </Button>
      {res?.ok ? (
        <span className="text-xs text-emerald-600">
          {res.alteradas ? `${res.alteradas} aba(s) atualizada(s)` : "Já estava atualizado"}
        </span>
      ) : null}
      {res?.erro ? <span className="text-xs text-destructive">{res.erro}</span> : null}
    </div>
  );
}
