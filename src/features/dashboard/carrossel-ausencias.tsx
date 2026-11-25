"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarOff, ChevronLeft, ChevronRight, Palmtree } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ItemAusencia {
  chave: string;
  tipo: "ferias" | "folga";
  nome: string;
  rotulo: string;
  periodo: string;
  volta: string | null;
  quando: string;
  quandoCor: string;
}

/**
 * Carrossel das próximas ausências: primeiro as folgas, depois as férias. Rola com as setas ou arrastando
 * (no celular), e os atalhos "Folgas" e "Férias" pulam direto para cada grupo.
 */
export function CarrosselAusencias({ itens }: { itens: ItemAusencia[] }) {
  const trilho = useRef<HTMLUListElement>(null);
  const [voltar, setVoltar] = useState(false);
  const [avancar, setAvancar] = useState(false);

  const folgas = itens.filter((i) => i.tipo === "folga").length;
  const ferias = itens.length - folgas;

  const atualizar = useCallback(() => {
    const el = trilho.current;
    if (!el) return;
    setVoltar(el.scrollLeft > 4);
    setAvancar(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = trilho.current;
    if (!el) return;
    atualizar();
    const obs = new ResizeObserver(atualizar);
    obs.observe(el);
    return () => obs.disconnect();
  }, [atualizar, itens.length]);

  function rolar(sentido: 1 | -1) {
    const el = trilho.current;
    if (el) el.scrollBy({ left: sentido * el.clientWidth * 0.9, behavior: "smooth" });
  }

  /** Leva o início do grupo escolhido para a esquerda do carrossel. */
  function irPara(tipo: "folga" | "ferias") {
    const el = trilho.current;
    const alvo = el?.querySelector<HTMLElement>(`[data-tipo="${tipo}"]`);
    if (el && alvo) el.scrollTo({ left: alvo.offsetLeft - el.offsetLeft, behavior: "smooth" });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium">
          {folgas > 0 ? (
            <button type="button" onClick={() => irPara("folga")} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 transition-colors hover:bg-muted">
              <CalendarOff className="size-3.5 text-sky-600" /> Folgas ({folgas})
            </button>
          ) : null}
          {ferias > 0 ? (
            <button type="button" onClick={() => irPara("ferias")} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 transition-colors hover:bg-muted">
              <Palmtree className="size-3.5 text-emerald-600" /> Férias ({ferias})
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Anteriores"
            onClick={() => rolar(-1)}
            disabled={!voltar}
            className="grid size-8 place-items-center rounded-full border transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Próximos"
            onClick={() => rolar(1)}
            disabled={!avancar}
            className="grid size-8 place-items-center rounded-full border transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <ul
        ref={trilho}
        onScroll={atualizar}
        className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {itens.map((a, i) => {
          const primeiroDoGrupo = i === 0 || itens[i - 1].tipo !== a.tipo;
          const Icone = a.tipo === "ferias" ? Palmtree : CalendarOff;
          return (
            <li
              key={a.chave}
              data-tipo={primeiroDoGrupo ? a.tipo : undefined}
              className="min-w-0 shrink-0 basis-full snap-start sm:basis-[calc(50%-0.375rem)] xl:basis-[calc(33.333%-0.5rem)]"
            >
              <div className="flex h-full items-start gap-3 rounded-xl border bg-background/60 p-4">
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", a.tipo === "ferias" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700")}>
                  <Icone className="size-4" />
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <p className="truncate text-sm font-semibold">{a.nome}</p>
                    <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold", a.quandoCor)}>{a.quando}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {a.rotulo} · {a.periodo}
                    {a.volta ? <span className="block">Volta em {a.volta}</span> : null}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
