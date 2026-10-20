"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil } from "lucide-react";
import { renomearItemEstoque } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Nome de um item do estoque com o lápis de renomear (só quando permitido: gerente).
 * A troca fica registrada no histórico do Estoque.
 */
export function NomeItemEditavel({
  itemId,
  nome,
  podeRenomear,
  aoRenomear,
  conversaId,
  className,
}: {
  itemId: string;
  nome: string;
  podeRenomear: boolean;
  aoRenomear?: () => void;
  /** Conversa do chat de onde se está renomeando (a troca é avisada nela). */
  conversaId?: string;
  className?: string;
}) {
  const [editando, setEditando] = useState(false);
  const [novo, setNovo] = useState(nome);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, start] = useTransition();

  function salvar() {
    setErro(null);
    start(async () => {
      const r = await renomearItemEstoque(itemId, novo, conversaId);
      if (r.erro) setErro(r.erro);
      else {
        setEditando(false);
        aoRenomear?.();
      }
    });
  }

  if (editando) {
    return (
      <span className="flex min-w-0 flex-1 flex-col gap-1 text-foreground">
        <span className="flex items-center gap-1">
          <Input
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            maxLength={120}
            autoFocus
            className="h-7 text-xs"
            aria-label="Novo nome do item do estoque"
            onKeyDown={(e) => {
              if (e.key === "Enter") salvar();
              if (e.key === "Escape") setEditando(false);
            }}
          />
          <Button type="button" size="sm" className="h-7 px-2 text-xs" onClick={salvar} disabled={pendente}>
            {pendente ? <Loader2 className="size-3 animate-spin" /> : "Salvar"}
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditando(false)}>
            Cancelar
          </Button>
        </span>
        <span className="text-[10px] text-muted-foreground">A troca fica registrada no histórico do Estoque.</span>
        {erro ? <span className="text-[11px] text-destructive">{erro}</span> : null}
      </span>
    );
  }

  return (
    <span className={className ?? "inline-flex items-center gap-1"}>
      <span className="font-medium">{nome}</span>
      {podeRenomear ? (
        <button
          type="button"
          onClick={() => {
            setNovo(nome);
            setErro(null);
            setEditando(true);
          }}
          className="rounded p-0.5 opacity-70 hover:bg-accent hover:text-foreground hover:opacity-100"
          title="Renomear item do estoque"
          aria-label={"Renomear " + nome}
        >
          <Pencil className="size-3" />
        </button>
      ) : null}
    </span>
  );
}
