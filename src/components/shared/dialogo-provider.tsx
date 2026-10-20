"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OpcoesConfirmacao {
  titulo: string;
  descricao?: string;
  /** Texto do botão de confirmar (padrão: "Confirmar"). */
  confirmar?: string;
  /** Texto do botão de cancelar (padrão: "Cancelar"). */
  cancelar?: string;
  /** Ação destrutiva (botão vermelho). */
  perigo?: boolean;
}

interface Dialogo {
  /** Caixa de confirmação do sistema; resolve true ao confirmar e false ao cancelar. */
  confirmar: (opcoes: OpcoesConfirmacao) => Promise<boolean>;
  /** Aviso simples do sistema (substitui o alert do navegador). */
  avisar: (mensagem: string, titulo?: string) => Promise<void>;
}

const Contexto = createContext<Dialogo | null>(null);

export function useDialogo(): Dialogo {
  const c = useContext(Contexto);
  if (!c) throw new Error("useDialogo precisa estar dentro do DialogoProvider.");
  return c;
}

type Pedido =
  | { tipo: "confirmar"; opcoes: OpcoesConfirmacao; resolver: (v: boolean) => void }
  | { tipo: "avisar"; titulo: string; mensagem: string; resolver: () => void };

/** Caixas de confirmação e de aviso no visual do sistema (no lugar das caixas do navegador). */
export function DialogoProvider({ children }: { children: React.ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);

  const confirmar = useCallback(
    (opcoes: OpcoesConfirmacao) => new Promise<boolean>((resolver) => setPedido({ tipo: "confirmar", opcoes, resolver })),
    []
  );
  const avisar = useCallback(
    (mensagem: string, titulo = "Aviso") => new Promise<void>((resolver) => setPedido({ tipo: "avisar", titulo, mensagem, resolver })),
    []
  );

  function fechar(resposta: boolean) {
    if (!pedido) return;
    if (pedido.tipo === "confirmar") pedido.resolver(resposta);
    else pedido.resolver();
    setPedido(null);
  }

  // Esc cancela; o foco vai para o botão principal; a tela de trás não rola.
  useEffect(() => {
    if (!pedido) return;
    botaoRef.current?.focus();
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function aoTecla(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (pedido!.tipo === "confirmar") pedido!.resolver(false);
        else pedido!.resolver();
        setPedido(null);
      }
    }
    document.addEventListener("keydown", aoTecla);
    return () => {
      document.removeEventListener("keydown", aoTecla);
      document.body.style.overflow = anterior;
    };
  }, [pedido]);

  const perigo = pedido?.tipo === "confirmar" && !!pedido.opcoes.perigo;

  return (
    <Contexto.Provider value={{ confirmar, avisar }}>
      {children}
      {pedido ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) fechar(false);
          }}
        >
          <div
            role={pedido.tipo === "confirmar" ? "alertdialog" : "dialog"}
            aria-modal="true"
            aria-labelledby="dialogo-titulo"
            className="w-full max-w-md space-y-4 rounded-xl border bg-card p-6 text-card-foreground shadow-xl"
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full",
                  perigo ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                )}
              >
                {perigo ? <AlertTriangle className="size-5" /> : <Info className="size-5" />}
              </span>
              <div className="min-w-0 space-y-1">
                <h2 id="dialogo-titulo" className="text-base font-semibold leading-tight">
                  {pedido.tipo === "confirmar" ? pedido.opcoes.titulo : pedido.titulo}
                </h2>
                {(pedido.tipo === "confirmar" ? pedido.opcoes.descricao : pedido.mensagem) ? (
                  <p className="whitespace-pre-line text-sm text-muted-foreground">
                    {pedido.tipo === "confirmar" ? pedido.opcoes.descricao : pedido.mensagem}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              {pedido.tipo === "confirmar" ? (
                <Button type="button" variant="outline" onClick={() => fechar(false)}>
                  {pedido.opcoes.cancelar ?? "Cancelar"}
                </Button>
              ) : null}
              <Button
                ref={botaoRef}
                type="button"
                variant={perigo ? "destructive" : "default"}
                onClick={() => fechar(true)}
              >
                {pedido.tipo === "confirmar" ? pedido.opcoes.confirmar ?? "Confirmar" : "Entendi"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Contexto.Provider>
  );
}
