"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const DIAS = ["D", "S", "T", "Q", "Q", "S", "S"];
const LARGURA = 296;

const iso = (a: number, m: number, d: number) => new Date(Date.UTC(a, m, d)).toISOString().slice(0, 10);
const hojeSP = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const mostrar = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v.slice(8)}/${v.slice(5, 7)}/${v.slice(0, 4)}` : "");

/** Seletor de data no padrão do painel (no lugar do calendário nativo do navegador). O valor é AAAA-MM-DD. */
export function SeletorData({
  id,
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  className,
  limpavel = true,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  limpavel?: boolean;
}) {
  const hoje = hojeSP();
  const base = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : hoje;
  const [aberto, setAberto] = useState(false);
  const [cursor, setCursor] = useState({ a: Number(base.slice(0, 4)), m: Number(base.slice(5, 7)) - 1 });
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const botao = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const aoTecla = (e: KeyboardEvent) => e.key === "Escape" && (e.stopPropagation(), setAberto(false));
    const fechar = () => setAberto(false);
    document.addEventListener("keydown", aoTecla, true);
    window.addEventListener("resize", fechar);
    return () => {
      document.removeEventListener("keydown", aoTecla, true);
      window.removeEventListener("resize", fechar);
    };
  }, [aberto]);

  function abrir() {
    const r = botao.current?.getBoundingClientRect();
    if (!r) return;
    setCursor({ a: Number(base.slice(0, 4)), m: Number(base.slice(5, 7)) - 1 });
    const altura = 372;
    const abaixo = window.innerHeight - r.bottom >= altura + 12;
    setPos({
      top: abaixo ? r.bottom + 6 : Math.max(8, r.top - altura - 6),
      left: Math.min(Math.max(8, r.left), window.innerWidth - LARGURA - 8),
    });
    setAberto(true);
  }

  const celulas = useMemo(() => {
    const inicio = new Date(Date.UTC(cursor.a, cursor.m, 1)).getUTCDay();
    const prefixo = `${cursor.a}-${String(cursor.m + 1).padStart(2, "0")}`;
    return Array.from({ length: 42 }, (_, n) => {
      const data = iso(cursor.a, cursor.m, 1 - inicio + n);
      return { data, dia: Number(data.slice(8)), doMes: data.startsWith(prefixo) };
    });
  }, [cursor]);
  const semanas = celulas.slice(35).every((c) => !c.doMes) ? 5 : 6;

  function mover(delta: number) {
    setCursor((c) => {
      const d = new Date(Date.UTC(c.a, c.m + delta, 1));
      return { a: d.getUTCFullYear(), m: d.getUTCMonth() };
    });
  }

  function escolher(data: string) {
    onChange(data);
    setAberto(false);
    botao.current?.focus();
  }

  return (
    <>
      <button
        ref={botao}
        id={id}
        type="button"
        onClick={() => (aberto ? setAberto(false) : abrir())}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-sm ring-offset-background transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className
        )}
      >
        <span className={cn(!value && "text-muted-foreground")}>{mostrar(value) || placeholder}</span>
        <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {aberto ? (
        <>
          <div className="fixed inset-0 z-[110]" onMouseDown={() => setAberto(false)} />
          <div
            role="dialog"
            aria-label="Escolher data"
            className="fixed z-[111] overflow-hidden rounded-2xl border bg-popover p-3 text-popover-foreground shadow-2xl animate-in fade-in-0 zoom-in-95"
            style={{ top: pos.top, left: pos.left, width: LARGURA }}
          >
            <div className="mb-2 flex items-center justify-between">
              <button type="button" onClick={() => mover(-1)} aria-label="Mês anterior" className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <ChevronLeft className="size-4" />
              </button>
              <p className="text-sm font-semibold capitalize">
                {MESES[cursor.m]} <span className="font-normal text-muted-foreground">{cursor.a}</span>
              </p>
              <button type="button" onClick={() => mover(1)} aria-label="Próximo mês" className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase text-muted-foreground">
              {DIAS.map((d, i) => (
                <span key={i} className="py-1">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5">
              {celulas.slice(0, semanas * 7).map((c) => {
                const selecionado = c.data === value;
                const ehHoje = c.data === hoje;
                return (
                  <button
                    key={c.data}
                    type="button"
                    onClick={() => escolher(c.data)}
                    aria-label={mostrar(c.data)}
                    aria-pressed={selecionado}
                    className={cn(
                      "mx-auto grid size-9 place-items-center rounded-full text-sm transition-colors",
                      c.doMes ? "text-foreground" : "text-muted-foreground/50",
                      !selecionado && "hover:bg-accent",
                      ehHoje && !selecionado && "font-semibold text-primary ring-1 ring-inset ring-primary/60",
                      selecionado && "bg-primary font-semibold text-primary-foreground shadow-sm"
                    )}
                  >
                    {c.dia}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm">
              {limpavel ? (
                <button
                  type="button"
                  onClick={() => escolher("")}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X className="size-3.5" /> Limpar
                </button>
              ) : (
                <span />
              )}
              <button type="button" onClick={() => escolher(hoje)} className="rounded-md px-2 py-1 font-medium text-primary transition-colors hover:bg-primary/10">
                Hoje
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
