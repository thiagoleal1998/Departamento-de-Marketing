"use client";

import { CornerUpLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";

const resumo = (t: string, max = 90) => (t.length > max ? t.slice(0, max - 1) + "…" : t);

/** Citação da mensagem respondida, dentro do balão: quem disse e o começo do texto. Clicar leva até ela. */
export function Citacao({ nome, texto, minha, onIr }: { nome: string; texto: string | null; minha: boolean; onIr?: () => void }) {
  return (
    <button
      type="button"
      onClick={onIr}
      disabled={!onIr}
      className={cn(
        "mb-1 block w-full rounded-md border-l-4 px-2 py-1 text-left text-xs",
        minha ? "border-white/70 bg-white/15" : "border-primary/70 bg-background/60",
        onIr ? "cursor-pointer hover:opacity-80" : "cursor-default"
      )}
      aria-label={`Resposta a ${nome}`}
    >
      <span className="flex items-center gap-1 font-semibold opacity-90">
        <CornerUpLeft className="size-3" /> {nome}
      </span>
      <span className="block whitespace-pre-wrap break-words opacity-80">{texto ? resumo(texto) : "Mensagem anterior"}</span>
    </button>
  );
}

/** Faixa acima da caixa de texto: "Respondendo a …" com botão para cancelar. */
export function BarraResposta({ nome, texto, onCancelar }: { nome: string; texto: string; onCancelar: () => void }) {
  return (
    <div className="flex items-start gap-2 border-t bg-muted/60 px-3 py-1.5 text-xs">
      <CornerUpLeft className="mt-0.5 size-3.5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Respondendo a {nome}</p>
        <p className="truncate text-muted-foreground">{resumo(texto, 120)}</p>
      </div>
      <button type="button" onClick={onCancelar} aria-label="Cancelar resposta" className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground">
        <X className="size-4" />
      </button>
    </div>
  );
}

/** Botão "Responder" que aparece ao passar o mouse na mensagem (sempre visível no toque). */
export function BotaoResponder({ onClick, nome }: { onClick: () => void; nome: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Responder a ${nome}`}
      title="Responder"
      className="grid size-6 shrink-0 place-items-center self-center rounded-full text-muted-foreground opacity-50 transition hover:bg-muted hover:opacity-100 group-hover:opacity-100"
    >
      <CornerUpLeft className="size-3.5" />
    </button>
  );
}
