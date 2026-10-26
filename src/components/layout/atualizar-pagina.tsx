"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Recarrega os dados da tela atual sem atualizar o navegador (mantém a rolagem e o que está aberto). */
export function AtualizarPagina() {
  const router = useRouter();
  const [pendente, start] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title="Atualizar esta tela"
      aria-label="Atualizar esta tela"
      disabled={pendente}
      onClick={() => start(() => router.refresh())}
    >
      <RefreshCw className={cn("size-4", pendente && "animate-spin")} />
    </Button>
  );
}
