"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import type { DadosAbaComercial } from "./tipos";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/** Cor do texto com bom contraste sobre o fundo da célula. */
function corTexto(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 140 ? "#111827" : "#ffffff";
}

/** Réplica da aba da planilha (cores, mesclagens e cabeçalho fixo) com busca. */
export function GradeComercial({ dados }: { dados: DadosAbaComercial }) {
  const [busca, setBusca] = useState("");
  const [atual, setAtual] = useState(0);
  const linhasRef = useRef<Map<number, HTMLTableRowElement>>(new Map());

  const porLinha = useMemo(() => {
    const m = new Map<number, Map<number, { v?: string; bg?: string }>>();
    for (const c of dados.celulas) {
      const l = m.get(c.r) ?? new Map();
      l.set(c.c, { v: c.v, bg: c.bg });
      m.set(c.r, l);
    }
    return m;
  }, [dados]);

  // Mesclagens: célula inicial recebe rowSpan/colSpan; as cobertas são puladas.
  const { inicio, cobertas } = useMemo(() => {
    const inicio = new Map<string, { rs: number; cs: number }>();
    const cobertas = new Set<string>();
    for (const m of dados.mesclagens) {
      inicio.set(`${m.r1}:${m.c1}`, { rs: m.r2 - m.r1 + 1, cs: m.c2 - m.c1 + 1 });
      for (let r = m.r1; r <= m.r2; r++)
        for (let c = m.c1; c <= m.c2; c++)
          if (r !== m.r1 || c !== m.c1) cobertas.add(`${r}:${c}`);
    }
    return { inicio, cobertas };
  }, [dados]);

  const termo = busca.trim().toLowerCase();
  const encontradas = useMemo(() => {
    if (!termo) return [] as number[];
    const rs = new Set<number>();
    for (const c of dados.celulas) if (c.v && c.v.toLowerCase().includes(termo)) rs.add(c.r);
    return Array.from(rs).sort((a, b) => a - b);
  }, [dados, termo]);

  function ir(delta: number) {
    if (encontradas.length === 0) return;
    const prox = (atual + delta + encontradas.length) % encontradas.length;
    setAtual(prox);
    linhasRef.current.get(encontradas[prox])?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  const marcadas = new Set(encontradas);
  const alvo = encontradas[atual];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setAtual(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") ir(e.shiftKey ? -1 : 1);
            }}
            placeholder="Buscar hotel, condição, disponibilidade…"
            className="h-9 w-80 pl-8"
            aria-label="Buscar na planilha"
          />
        </div>
        {termo ? (
          <>
            <span className="text-xs text-muted-foreground">
              {encontradas.length === 0 ? "Nada encontrado" : `${atual + 1} de ${encontradas.length} linhas`}
            </span>
            <Button type="button" variant="outline" size="icon" className="size-8" onClick={() => ir(-1)} aria-label="Anterior">
              <ChevronUp className="size-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" className="size-8" onClick={() => ir(1)} aria-label="Próximo">
              <ChevronDown className="size-4" />
            </Button>
          </>
        ) : null}
      </div>

      <div className="max-h-[75vh] overflow-auto rounded-lg border bg-white text-[12px] text-gray-900">
        <table className="border-separate border-spacing-0" style={{ tableLayout: "fixed" }}>
          <colgroup>
            {dados.larguras.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
          <tbody>
            {Array.from({ length: dados.linhas }, (_, r) => {
              const linha = porLinha.get(r);
              const ehCab = dados.cabecalho === r;
              const destaque = marcadas.has(r);
              return (
                <tr
                  key={r}
                  ref={(el) => {
                    if (el) linhasRef.current.set(r, el);
                  }}
                  className={destaque ? (r === alvo ? "outline outline-2 outline-primary" : "outline outline-1 outline-amber-400") : undefined}
                >
                  {Array.from({ length: dados.colunas }, (_, c) => {
                    const chave = `${r}:${c}`;
                    if (cobertas.has(chave)) return null;
                    const cel = linha?.get(c);
                    const span = inicio.get(chave);
                    const bg = cel?.bg;
                    return (
                      <td
                        key={c}
                        rowSpan={span?.rs}
                        colSpan={span?.cs}
                        className={
                          "whitespace-pre-wrap break-words border-b border-r border-gray-200 px-1.5 py-1 align-top " +
                          (ehCab ? "sticky top-0 z-10 font-semibold" : "")
                        }
                        style={{
                          backgroundColor: bg ?? (ehCab ? "#e5e7eb" : undefined),
                          color: bg ? corTexto(bg) : undefined,
                        }}
                      >
                        {cel?.v}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
