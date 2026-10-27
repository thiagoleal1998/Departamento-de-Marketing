"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "@/components/shared/link";
import { cn } from "@/lib/utils";
import { corTipo, concluido, itensDosProjetos, seloDe, type ItemCalendario, type ProjetoNoCalendario } from "./lista-calendario";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const TROCA_MS = 10_000; // passa sozinho para o outro mês a cada 10 s
const POR_CELULA = 3;

const iso = (a: number, m: number, d: number) => new Date(Date.UTC(a, m, d)).toISOString().slice(0, 10);

/**
 * Calendário do mês vigente e do seguinte para o painel de gerente e líder: alterna sozinho entre os dois
 * (pausa com o mouse em cima) e mostra os itens do Calendário geral e os projetos (famtour, evento, feira…).
 */
export function CalendarioDashboard({ itens, projetos, hoje }: { itens: ItemCalendario[]; projetos: ProjetoNoCalendario[]; hoje: string }) {
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);

  const meses = useMemo(() => {
    const a = Number(hoje.slice(0, 4));
    const m = Number(hoje.slice(5, 7)) - 1;
    return [0, 1].map((d) => {
      const base = new Date(Date.UTC(a, m + d, 1));
      return { a: base.getUTCFullYear(), m: base.getUTCMonth() };
    });
  }, [hoje]);

  const todos = useMemo(() => [...itens, ...itensDosProjetos(projetos)], [itens, projetos]);
  const porData = useMemo(() => {
    const mapa = new Map<string, ItemCalendario[]>();
    for (const i of todos) if (i.data) mapa.set(i.data, [...(mapa.get(i.data) ?? []), i]);
    return mapa;
  }, [todos]);

  useEffect(() => {
    if (pausado) return;
    const t = setInterval(() => setIndice((i) => (i + 1) % 2), TROCA_MS);
    return () => clearInterval(t);
  }, [pausado]);

  const { a, m } = meses[indice];
  const prefixo = `${a}-${String(m + 1).padStart(2, "0")}`;
  const celulas = useMemo(() => {
    const inicio = new Date(Date.UTC(a, m, 1)).getUTCDay();
    return Array.from({ length: 42 }, (_, n) => {
      const data = iso(a, m, 1 - inicio + n);
      return { data, dia: Number(data.slice(8)), doMes: data.startsWith(prefixo) };
    });
  }, [a, m, prefixo]);
  const semanas = celulas.slice(35).every((c) => !c.doMes) ? 5 : 6;
  const noMes = todos.filter((i) => i.data?.startsWith(prefixo)).length;

  return (
    <section
      aria-label="Calendário do mês e do mês seguinte"
      className="rounded-2xl border bg-card p-4 shadow-sm"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <CalendarDays className="size-5 text-primary" />
          <span key={indice} className="animate-in fade-in-0 slide-in-from-bottom-1 duration-500">
            {MESES[m]} <span className="font-normal text-muted-foreground">{a}</span>
          </span>
        </h2>
        <span className="text-xs text-muted-foreground">{noMes} no mês</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Mês exibido">
            {meses.map((x, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === indice}
                aria-label={`${MESES[x.m]} de ${x.a}`}
                onClick={() => setIndice(i)}
                className={cn("h-2 rounded-full transition-all", i === indice ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60")}
              />
            ))}
          </div>
          <button type="button" onClick={() => setIndice((i) => (i + 1) % 2)} aria-label="Mês anterior" className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" onClick={() => setIndice((i) => (i + 1) % 2)} aria-label="Próximo mês" className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
            <ChevronRight className="size-4" />
          </button>
          <Link href="/operacional/calendario" className="text-xs font-medium text-primary hover:underline">
            Abrir calendário
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div key={indice} className="min-w-[640px] animate-in fade-in-0 slide-in-from-right-2 overflow-hidden rounded-xl border duration-500">
          <div className="grid grid-cols-7 border-b bg-muted/40 text-[11px] font-semibold uppercase text-muted-foreground">
            {DIAS.map((d) => (
              <div key={d} className="px-2 py-1.5 text-center">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {celulas.slice(0, semanas * 7).map((c, n) => {
              const lista = c.doMes ? porData.get(c.data) ?? [] : [];
              const ehHoje = c.data === hoje;
              return (
                <div
                  key={c.data}
                  className={cn(
                    "min-h-20 space-y-0.5 border-b border-r p-1",
                    n % 7 === 6 && "border-r-0",
                    n >= (semanas - 1) * 7 && "border-b-0",
                    !c.doMes && "bg-muted/30",
                    c.doMes && (n % 7 === 0 || n % 7 === 6) && "bg-muted/20"
                  )}
                >
                  <span className={cn("grid size-5 place-items-center rounded-full text-[11px] font-medium", !c.doMes && "text-muted-foreground/40", ehHoje && "bg-primary text-primary-foreground")}>
                    {c.dia}
                  </span>
                  {lista.slice(0, POR_CELULA).map((i) => {
                    const cor = corTipo(i.tipo);
                    const classe = cn(
                      "flex w-full items-center gap-1 truncate rounded px-1 py-px text-left text-[10px] leading-4",
                      i.href ? cn("font-semibold text-white", cor.ponto) : cn("font-medium", cor.chip),
                      concluido(i.status) && "opacity-60"
                    );
                    const conteudo = (
                      <>
                        {i.href ? <span className="shrink-0 rounded-sm bg-black/25 px-0.5 text-[8px] font-extrabold tracking-wider">{seloDe(i.tipo)}</span> : null}
                        <span className="truncate">{i.nome}</span>
                      </>
                    );
                    return i.href ? (
                      <Link key={i.id} href={i.href} title={`${i.nome} · ${i.tipo}`} className={classe}>
                        {conteudo}
                      </Link>
                    ) : (
                      <Link key={i.id} href="/operacional/calendario" title={`${i.nome} · ${i.tipo ?? ""}`} className={classe}>
                        {conteudo}
                      </Link>
                    );
                  })}
                  {lista.length > POR_CELULA ? <span className="block px-1 text-[10px] font-medium text-muted-foreground">+{lista.length - POR_CELULA} mais</span> : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
