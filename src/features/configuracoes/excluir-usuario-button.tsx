"use client";

import { useState, useTransition } from "react";
import { Trash2, AlertTriangle, Loader2, X } from "lucide-react";
import { excluirUsuario } from "./actions";
import { Button } from "@/components/ui/button";

export function ExcluirUsuarioButton({
  id,
  nome,
}: {
  id: string;
  nome: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  function confirmar() {
    setErro(null);
    startTransition(async () => {
      const res = await excluirUsuario(id);
      if (res?.erro) {
        setErro(res.erro);
      } else {
        setAberto(false);
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Excluir usuário"
        aria-label={`Excluir ${nome}`}
        onClick={() => {
          setErro(null);
          setAberto(true);
        }}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </Button>

      {aberto ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !pendente && setAberto(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="size-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold">Excluir usuário</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tem certeza que deseja excluir{" "}
                  <span className="font-medium text-foreground">{nome}</span>?
                </p>
                <div className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Esta ação é <strong>irreversível</strong>. O acesso e os
                  registros vinculados a este usuário (feedbacks, 1:1, chamados
                  que ele abriu) serão removidos permanentemente.
                </div>
              </div>
              <button
                type="button"
                onClick={() => !pendente && setAberto(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </div>

            {erro ? (
              <p className="mt-3 text-sm text-destructive">{erro}</p>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAberto(false)}
                disabled={pendente}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmar}
                disabled={pendente}
              >
                {pendente ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Excluir definitivamente
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
