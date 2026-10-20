"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Se uma tela da área logada falhar no navegador, mostra o aviso (com o texto técnico do erro,
 * para facilitar o suporte) em vez da página em branco "Application error".
 */
export default function ErroDaTela({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Erro na tela:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl space-y-4 rounded-xl border border-destructive/40 bg-destructive/5 p-6">
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="size-5" />
        <h1 className="text-lg font-semibold">Algo deu errado nesta tela</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        O restante do painel continua funcionando (use o menu ao lado). Se o problema se repetir, envie o texto abaixo para o
        suporte.
      </p>
      <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
        {error.message || "Erro sem mensagem"}
        {error.digest ? `\n(código: ${error.digest})` : ""}
        {error.stack ? `\n\n${error.stack.split("\n").slice(0, 6).join("\n")}` : ""}
      </pre>
      <Button type="button" onClick={reset}>
        <RotateCcw className="size-4" /> Tentar de novo
      </Button>
    </div>
  );
}
