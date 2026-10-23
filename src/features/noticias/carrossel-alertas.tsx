"use client";

import { useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Quadro de alertas com dois "slides": hoje e a semana inteira.
 * O conteúdo de cada slide vem pronto do servidor; aqui só se alterna entre eles.
 */
export function CarrosselAlertas({
  hoje,
  semana,
  alertasHoje,
  alertasSemana,
}: {
  hoje: React.ReactNode;
  semana: React.ReactNode;
  alertasHoje: number;
  alertasSemana: number;
}) {
  const [slide, setSlide] = useState<0 | 1>(0);
  const slides = [
    { titulo: "Alertas dos destinos de hoje", curto: "Hoje", qtd: alertasHoje, conteudo: hoje },
    { titulo: "Alertas da semana", curto: "Semana", qtd: alertasSemana, conteudo: semana },
  ];
  const atual = slides[slide];
  const comAlerta = atual.qtd > 0;

  return (
    <section aria-label={atual.titulo} className={cn("flex flex-col rounded-xl border bg-card shadow-sm", comAlerta && "border-red-300")}>
      <header className="flex flex-wrap items-center justify-between gap-2 px-5 pb-2 pt-4">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          {comAlerta ? <ShieldAlert className="size-5 text-red-600" /> : <CheckCircle2 className="size-5 text-emerald-600" />}
          {atual.titulo}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSlide(slide === 0 ? 1 : 0)}
            aria-label="Slide anterior"
            className="rounded-md border p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          {slides.map((s, i) => (
            <button
              key={s.curto}
              type="button"
              onClick={() => setSlide(i as 0 | 1)}
              aria-pressed={slide === i}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                slide === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {s.curto}
              {s.qtd > 0 ? <span className="ml-1 rounded-full bg-red-600 px-1.5 text-[10px] text-white">{s.qtd}</span> : null}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSlide(slide === 0 ? 1 : 0)}
            aria-label="Próximo slide"
            className="rounded-md border p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </header>
      <div className="max-h-[300px] flex-1 space-y-4 overflow-y-auto px-5 pb-5">{atual.conteudo}</div>
    </section>
  );
}
