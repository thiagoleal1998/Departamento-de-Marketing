"use client";

import { useState } from "react";
import { FATOR_META, type FatorDisc, type PontoHistorico } from "./tipos";

const FATORES: FatorDisc[] = ["D", "I", "S", "C"];
const COR_TRACO: Record<FatorDisc, string> = { D: "#dc2626", I: "#f59e0b", S: "#059669", C: "#2563eb" };

const L = 640;
const A = 260;
const M = { e: 36, d: 20, t: 14, b: 34 };
const MIN = -24;
const MAX = 24;

const dataCurta = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");

/** Evolução das quatro pontuações (D, I, S, C) ao longo das pesquisas. Escala fixa do relatório: -24 a +24. */
export function GraficoEvolucao({ pontos }: { pontos: PontoHistorico[] }) {
  const [i, setI] = useState<number | null>(null);
  const n = pontos.length;
  const x = (k: number) => M.e + (n <= 1 ? (L - M.e - M.d) / 2 : (k * (L - M.e - M.d)) / (n - 1));
  const y = (v: number) => M.t + (1 - (v - MIN) / (MAX - MIN)) * (A - M.t - M.b);
  const marcas = [-24, -12, 0, 12, 24];

  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {FATORES.map((f) => (
          <li key={f} className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full" style={{ background: COR_TRACO[f] }} />
            {FATOR_META[f].nome} ({f})
          </li>
        ))}
      </ul>
      <div className="relative" onMouseLeave={() => setI(null)}>
        <svg viewBox={`0 0 ${L} ${A}`} className="w-full" role="img" aria-label="Evolução das pontuações DISC por pesquisa">
          {marcas.map((m) => (
            <g key={m}>
              <line x1={M.e} x2={L - M.d} y1={y(m)} y2={y(m)} className={m === 0 ? "stroke-muted-foreground/60" : "stroke-border"} strokeWidth={1} strokeDasharray={m === 0 ? "4 3" : undefined} />
              <text x={M.e - 6} y={y(m) + 3} textAnchor="end" className="fill-muted-foreground text-[10px]">{m}</text>
            </g>
          ))}
          {pontos.map((p, k) => (
            <g key={p.participante_id} onMouseEnter={() => setI(k)}>
              <rect x={x(k) - 24} y={M.t} width={48} height={A - M.t - M.b} fill="transparent" />
              <text x={x(k)} y={A - 12} textAnchor="middle" className="fill-muted-foreground text-[10px]">{dataCurta(p.concluido_em)}</text>
            </g>
          ))}
          {i !== null ? <line x1={x(i)} x2={x(i)} y1={M.t} y2={A - M.b} className="stroke-muted-foreground/50" strokeWidth={1} /> : null}
          {FATORES.map((f) => {
            const caminho = pontos.map((p, k) => `${k === 0 ? "M" : "L"}${x(k).toFixed(1)} ${y(p.pontuacoes[f] ?? 0).toFixed(1)}`).join(" ");
            return (
              <g key={f}>
                {n > 1 ? <path d={caminho} fill="none" stroke={COR_TRACO[f]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /> : null}
                {pontos.map((p, k) => (
                  <circle key={p.participante_id} cx={x(k)} cy={y(p.pontuacoes[f] ?? 0)} r={i === k ? 5 : 3.5} fill={COR_TRACO[f]} className="stroke-card" strokeWidth={2} />
                ))}
              </g>
            );
          })}
        </svg>
        {i !== null ? (
          <div
            className="pointer-events-none absolute top-1 z-10 min-w-40 rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-md"
            style={{ left: `${(x(i) / L) * 100}%`, transform: x(i) > L * 0.65 ? "translateX(calc(-100% - 10px))" : "translateX(10px)" }}
          >
            <p className="mb-1 font-medium">{pontos[i].pesquisa ?? "Pesquisa"} · {dataCurta(pontos[i].concluido_em)}</p>
            {FATORES.map((f) => (
              <p key={f} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="inline-block size-2 rounded-full" style={{ background: COR_TRACO[f] }} />
                  {FATOR_META[f].nome}
                </span>
                <span className="font-medium tabular-nums">{pontos[i].pontuacoes[f] ?? 0}</span>
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
