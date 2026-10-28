"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Mic, X } from "lucide-react";
import { duracaoTexto, type AnexoChat } from "./anexo-tipos";

/** Imagem ou áudio dentro do balão: a imagem amplia ao clicar; o áudio tem player próprio. */
export function AnexoMensagem({ anexo }: { anexo: AnexoChat }) {
  const [ampliada, setAmpliada] = useState(false);

  useEffect(() => {
    if (!ampliada) return;
    const t = (e: KeyboardEvent) => e.key === "Escape" && setAmpliada(false);
    document.addEventListener("keydown", t);
    return () => document.removeEventListener("keydown", t);
  }, [ampliada]);

  if (anexo.tipo === "audio") {
    return (
      <div className="mb-1 mt-0.5 flex min-w-[15rem] items-center gap-2 rounded-xl bg-background/90 px-2 py-1.5 text-foreground">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <Mic className="size-4" />
        </span>
        <audio controls preload="metadata" src={anexo.url} className="h-8 min-w-0 flex-1" />
        {anexo.duracao ? <span className="shrink-0 text-[11px] text-muted-foreground">{duracaoTexto(anexo.duracao)}</span> : null}
      </div>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setAmpliada(true)} className="mb-1 mt-0.5 block overflow-hidden rounded-xl" aria-label="Ampliar imagem">
        <img src={anexo.url} alt={anexo.nome} loading="lazy" className="max-h-64 w-auto max-w-full object-cover transition-opacity hover:opacity-90" />
      </button>
      {ampliada
        ? createPortal(
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setAmpliada(false)}>
              <button type="button" onClick={() => setAmpliada(false)} aria-label="Fechar" className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70">
                <X className="size-5" />
              </button>
              <img src={anexo.url} alt={anexo.nome} className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
            </div>,
            document.body
          )
        : null}
    </>
  );
}
