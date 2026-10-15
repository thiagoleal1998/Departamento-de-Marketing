"use client";

import { useState, useTransition } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { renomearEtapaSugestao } from "./actions";
import type { SugestaoStatus } from "@/types/database";
import { Input } from "@/components/ui/input";

/** Título da coluna do kanban; o gerente pode renomear a etapa. */
export function NomeEtapa({
  status,
  nome,
  editavel,
}: {
  status: SugestaoStatus;
  nome: string;
  editavel: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(nome);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  function salvar() {
    setErro(null);
    startTransition(async () => {
      const res = await renomearEtapaSugestao(status, valor);
      if (res.erro) setErro(res.erro);
      else setEditando(false);
    });
  }

  if (!editando) {
    return (
      <div className="flex min-w-0 items-center gap-1">
        <h3 className="truncate text-sm font-semibold">{nome}</h3>
        {editavel ? (
          <button
            type="button"
            title="Renomear etapa"
            aria-label={`Renomear etapa ${nome}`}
            onClick={() => {
              setValor(nome);
              setEditando(true);
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          maxLength={40}
          autoFocus
          className="h-8 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") salvar();
            if (e.key === "Escape") setEditando(false);
          }}
        />
        <button
          type="button"
          onClick={salvar}
          disabled={pendente}
          aria-label="Salvar nome"
          className="text-emerald-600"
        >
          {pendente ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setEditando(false)}
          aria-label="Cancelar"
          className="text-muted-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      {erro ? <p className="text-xs text-destructive">{erro}</p> : null}
    </div>
  );
}
