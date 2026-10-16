"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { GerenciarSugestao } from "./gerenciar-sugestao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SugestaoStatus } from "@/types/database";

export interface CartaoSugestao {
  id: string;
  titulo: string;
  descricao: string;
  tipoRotulo: string;
  status: SugestaoStatus;
  resposta: string | null;
  /** Texto "Autor · data" (autor só para a liderança). */
  quando: string;
}

/** Card do kanban de feedback: clique abre o texto completo. */
export function CartaoKanban({
  s,
  ehGerente,
  rotulos,
}: {
  s: CartaoSugestao;
  ehGerente: boolean;
  rotulos: Record<SugestaoStatus, string>;
}) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    function aoTecla(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("keydown", aoTecla);
    return () => document.removeEventListener("keydown", aoTecla);
  }, [aberto]);

  return (
    <>
      <Card
        role="button"
        tabIndex={0}
        onClick={() => setAberto(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setAberto(true);
          }
        }}
        className="cursor-pointer transition-colors hover:border-primary/40 hover:bg-accent/30"
      >
        <CardContent className="space-y-2 p-3">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold leading-tight">{s.titulo}</h4>
            <Badge variant="secondary">{s.tipoRotulo}</Badge>
          </div>
          <p className="line-clamp-3 text-xs text-muted-foreground">
            {s.descricao}
          </p>
          <p className="text-[11px] text-muted-foreground">{s.quando}</p>
        </CardContent>
      </Card>

      {aberto ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
          onClick={() => setAberto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={s.titulo}
            className="w-full max-w-2xl space-y-4 rounded-xl bg-background p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{s.tipoRotulo}</Badge>
                  <Badge variant="outline">{rotulos[s.status]}</Badge>
                </div>
                <h3 className="text-lg font-semibold leading-tight">
                  {s.titulo}
                </h3>
                <p className="text-xs text-muted-foreground">{s.quando}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Fechar"
                onClick={() => setAberto(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <p className="whitespace-pre-line text-sm">{s.descricao}</p>

            {s.resposta && !ehGerente ? (
              <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                <p className="mb-1 text-xs font-medium text-primary">
                  Resposta da liderança
                </p>
                <p className="whitespace-pre-line">{s.resposta}</p>
              </div>
            ) : null}

            {ehGerente ? (
              <GerenciarSugestao
                id={s.id}
                statusInicial={s.status}
                respostaInicial={s.resposta}
                rotulos={rotulos}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
