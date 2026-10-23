"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { useDialogo } from "@/components/shared/dialogo-provider";
import { atualizarEmailsRD, desconectarRD } from "./rd-actions";
import { Button } from "@/components/ui/button";

/** Botões da aba RD Station: buscar os e-mails do período e (se quiser) desconectar. */
export function AtualizarEmails({ de, ate }: { de: string; ate: string }) {
  const { avisar, confirmar } = useDialogo();
  const router = useRouter();
  const [pendente, start] = useTransition();
  const [info, setInfo] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        className="h-9"
        disabled={pendente}
        onClick={() =>
          start(async () => {
            const r = await atualizarEmailsRD(de, ate);
            if (r.erro) void avisar(r.erro, "Não foi possível atualizar");
            else {
              setInfo(`${r.emails} e-mail(s) atualizados`);
              router.refresh();
            }
          })
        }
      >
        {pendente ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Buscar e-mails do período
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-9 text-muted-foreground"
        disabled={pendente}
        onClick={async () => {
          const ok = await confirmar({
            titulo: "Desconectar o RD Station?",
            descricao: "Os e-mails já guardados continuam no painel. Para voltar a atualizar, é preciso conectar de novo.",
            confirmar: "Desconectar",
            perigo: true,
          });
          if (!ok) return;
          start(async () => {
            await desconectarRD();
            router.refresh();
          });
        }}
      >
        Desconectar
      </Button>
      {info ? <span className="text-xs text-muted-foreground">{info}</span> : null}
    </div>
  );
}
