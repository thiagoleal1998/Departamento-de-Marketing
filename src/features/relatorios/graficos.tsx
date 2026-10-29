"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Gráficos do relatório do operacional, em SVG (sem biblioteca). Cores na ordem fixa da paleta de dados validada
 * (azul, laranja, água-marinha), com passo próprio para o tema escuro. Cada gráfico tem legenda quando há mais de
 * uma série, dica ao passar o mouse e uma versão em tabela.
 */
const COR = [
  { traco: "stroke-[#2a78d6] dark:stroke-[#3987e5]", preench: "fill-[#2a78d6] dark:fill-[#3987e5]", ponto: "bg-[#2a78d6] dark:bg-[#3987e5]" },
  { traco: "stroke-[#eb6834] dark:stroke-[#d95926]", preench: "fill-[#eb6834] dark:fill-[#d95926]", ponto: "bg-[#eb6834] dark:bg-[#d95926]" },
  { traco: "stroke-[#1baf7a] dark:stroke-[#199e70]", preench: "fill-[#1baf7a] dark:fill-[#199e70]", ponto: "bg-[#1baf7a] dark:bg-[#199e70]" },
] as const;

export interface SerieGrafico {
  nome: string;
  valores: (number | null)[];
}

const fmt = (v: number, casas = 0) => v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

/** Escala "bonita" para o eixo: devolve o topo e os marcadores. */
function escala(max: number) {
  if (max <= 0) return { topo: 1, marcas: [0, 1] };
  const bruto = max / 4;
  const pot = Math.pow(10, Math.floor(Math.log10(bruto)));
  const f = bruto / pot;
  const passo = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pot;
  const topo = Math.ceil(max / passo) * passo;
  const marcas: number[] = [];
  for (let v = 0; v <= topo + passo / 1000; v += passo) marcas.push(v);
  return { topo, marcas };
}

export function Cartao({ titulo, descricao, children, tabela }: { titulo: string; descricao?: string; children: React.ReactNode; tabela?: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <header className="space-y-0.5">
        <h3 className="text-sm font-semibold">{titulo}</h3>
        {descricao ? <p className="text-xs text-muted-foreground">{descricao}</p> : null}
      </header>
      {children}
      {tabela ? (
        <details className="text-xs">
          <summary className="cursor-pointer select-none text-muted-foreground hover:text-foreground">Ver como tabela</summary>
          <div className="mt-2 overflow-x-auto">{tabela}</div>
        </details>
      ) : null}
    </section>
  );
}

function Legenda({ series }: { series: SerieGrafico[] }) {
  if (series.length < 2) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {series.map((s, i) => (
        <li key={s.nome} className="flex items-center gap-1.5">
          <span className={cn("inline-block h-2.5 w-2.5 rounded-full", COR[i % 3].ponto)} />
          {s.nome}
        </li>
      ))}
    </ul>
  );
}

function TabelaDados({ rotulos, series, sufixo = "", casas = 0 }: { rotulos: string[]; series: SerieGrafico[]; sufixo?: string; casas?: number }) {
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b text-muted-foreground">
          <th className="py-1 pr-3 font-medium" />
          {series.map((s) => (
            <th key={s.nome} className="py-1 pr-3 font-medium">
              {s.nome}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rotulos.map((r, i) => (
          <tr key={r + i} className="border-b last:border-0">
            <td className="py-1 pr-3 text-muted-foreground">{r}</td>
            {series.map((s) => (
              <td key={s.nome} className="py-1 pr-3 tabular-nums">
                {s.valores[i] === null || s.valores[i] === undefined ? "—" : fmt(s.valores[i] as number, casas) + sufixo}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const L = 640;
const A = 220;
const M = { e: 40, d: 12, t: 12, b: 28 };

/** Linhas ao longo do tempo (reuniões ou meses), com dica ao passar o mouse. */
export function GraficoLinhas({
  titulo,
  descricao,
  rotulos,
  series,
  sufixo = "",
  casas = 0,
  maxFixo,
}: {
  titulo: string;
  descricao?: string;
  rotulos: string[];
  series: SerieGrafico[];
  sufixo?: string;
  casas?: number;
  maxFixo?: number;
}) {
  const [i, setI] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const n = rotulos.length;
  const max = maxFixo ?? Math.max(1, ...series.flatMap((s) => s.valores.filter((v): v is number => v !== null)));
  const { topo, marcas } = escala(max);
  const x = (k: number) => M.e + (n <= 1 ? (L - M.e - M.d) / 2 : (k * (L - M.e - M.d)) / (n - 1));
  const y = (v: number) => M.t + (1 - v / topo) * (A - M.t - M.b);
  const passoRotulo = Math.max(1, Math.ceil(n / 8));

  function mover(e: React.MouseEvent) {
    const r = ref.current?.getBoundingClientRect();
    if (!r || n === 0) return;
    const px = ((e.clientX - r.left) / r.width) * L;
    const k = Math.round(((px - M.e) / (L - M.e - M.d)) * (n - 1));
    setI(Math.max(0, Math.min(n - 1, k)));
  }

  return (
    <Cartao titulo={titulo} descricao={descricao} tabela={<TabelaDados rotulos={rotulos} series={series} sufixo={sufixo} casas={casas} />}>
      <Legenda series={series} />
      <div ref={ref} className="relative" onMouseMove={mover} onMouseLeave={() => setI(null)}>
        <svg viewBox={`0 0 ${L} ${A}`} className="w-full" role="img" aria-label={titulo}>
          {marcas.map((m) => (
            <g key={m}>
              <line x1={M.e} x2={L - M.d} y1={y(m)} y2={y(m)} className="stroke-border" strokeWidth={1} />
              <text x={M.e - 6} y={y(m) + 3} textAnchor="end" className="fill-muted-foreground text-[10px]">
                {fmt(m, casas)}
                {sufixo}
              </text>
            </g>
          ))}
          {rotulos.map((r, k) =>
            k % passoRotulo === 0 || k === n - 1 ? (
              <text key={r + k} x={x(k)} y={A - 8} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                {r}
              </text>
            ) : null
          )}
          {i !== null ? <line x1={x(i)} x2={x(i)} y1={M.t} y2={A - M.b} className="stroke-muted-foreground/50" strokeWidth={1} /> : null}
          {series.map((s, si) => {
            const pontos = s.valores.map((v, k) => (v === null ? null : ([x(k), y(v)] as const)));
            const caminho = pontos.reduce((d, p, k) => (p ? d + (k > 0 && pontos[k - 1] ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1) + " " : d), "");
            const ultimo = [...pontos].reverse().find(Boolean);
            return (
              <g key={s.nome}>
                <path d={caminho} fill="none" className={COR[si % 3].traco} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                {ultimo ? <circle cx={ultimo[0]} cy={ultimo[1]} r={4} className={cn(COR[si % 3].preench, "stroke-card")} strokeWidth={2} /> : null}
                {i !== null && pontos[i] ? <circle cx={pontos[i]![0]} cy={pontos[i]![1]} r={4.5} className={cn(COR[si % 3].preench, "stroke-card")} strokeWidth={2} /> : null}
              </g>
            );
          })}
        </svg>
        {i !== null ? (
          <div
            className="pointer-events-none absolute top-1 z-10 min-w-32 rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-md"
            style={{ left: `${(x(i) / L) * 100}%`, transform: x(i) > L * 0.65 ? "translateX(calc(-100% - 10px))" : "translateX(10px)" }}
          >
            <p className="mb-1 font-medium">{rotulos[i]}</p>
            {series.map((s, si) => (
              <p key={s.nome} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className={cn("inline-block h-2 w-2 rounded-full", COR[si % 3].ponto)} />
                  {s.nome}
                </span>
                <span className="font-medium tabular-nums">{s.valores[i] === null || s.valores[i] === undefined ? "—" : fmt(s.valores[i] as number, casas) + sufixo}</span>
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </Cartao>
  );
}

/** Colunas por período (uma ou duas séries lado a lado). */
export function GraficoColunas({
  titulo,
  descricao,
  rotulos,
  series,
  sufixo = "",
}: {
  titulo: string;
  descricao?: string;
  rotulos: string[];
  series: SerieGrafico[];
  sufixo?: string;
}) {
  const [i, setI] = useState<number | null>(null);
  const n = rotulos.length;
  const max = Math.max(1, ...series.flatMap((s) => s.valores.filter((v): v is number => v !== null)));
  const { topo, marcas } = escala(max);
  const faixa = (L - M.e - M.d) / Math.max(1, n);
  const larg = Math.min(26, (faixa * 0.7) / series.length);
  const y = (v: number) => M.t + (1 - v / topo) * (A - M.t - M.b);

  return (
    <Cartao titulo={titulo} descricao={descricao} tabela={<TabelaDados rotulos={rotulos} series={series} sufixo={sufixo} />}>
      <Legenda series={series} />
      <div className="relative" onMouseLeave={() => setI(null)}>
        <svg viewBox={`0 0 ${L} ${A}`} className="w-full" role="img" aria-label={titulo}>
          {marcas.map((m) => (
            <g key={m}>
              <line x1={M.e} x2={L - M.d} y1={y(m)} y2={y(m)} className="stroke-border" strokeWidth={1} />
              <text x={M.e - 6} y={y(m) + 3} textAnchor="end" className="fill-muted-foreground text-[10px]">
                {fmt(m)}
                {sufixo}
              </text>
            </g>
          ))}
          {rotulos.map((r, k) => {
            const cx = M.e + faixa * k + faixa / 2;
            return (
              <g key={r + k} onMouseEnter={() => setI(k)}>
                <rect x={M.e + faixa * k} y={M.t} width={faixa} height={A - M.t - M.b} fill="transparent" />
                {series.map((s, si) => {
                  const v = s.valores[k];
                  if (v === null || v === undefined) return null;
                  const h = Math.max(0, A - M.b - y(v));
                  const x0 = cx - (larg * series.length) / 2 + si * larg + (si > 0 ? 1 : 0);
                  return <rect key={s.nome} x={x0} y={y(v)} width={larg - 1} height={h} rx={3} className={cn(COR[si % 3].preench, i === k ? "opacity-100" : "opacity-90")} />;
                })}
                <text x={cx} y={A - 8} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                  {r}
                </text>
              </g>
            );
          })}
        </svg>
        {i !== null ? (
          <div className="pointer-events-none absolute right-2 top-1 z-10 min-w-32 rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-md">
            <p className="mb-1 font-medium">{rotulos[i]}</p>
            {series.map((s, si) => (
              <p key={s.nome} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className={cn("inline-block h-2 w-2 rounded-full", COR[si % 3].ponto)} />
                  {s.nome}
                </span>
                <span className="font-medium tabular-nums">{s.valores[i] === null || s.valores[i] === undefined ? "—" : fmt(s.valores[i] as number) + sufixo}</span>
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </Cartao>
  );
}

/** Barras horizontais ordenadas (rankings: motivos, pessoas, tipos). */
export function BarrasHorizontais({
  titulo,
  descricao,
  itens,
  sufixo = "",
  vazio = "Nada por aqui.",
  tom = 0,
}: {
  titulo: string;
  descricao?: string;
  itens: { rotulo: string; valor: number; detalhe?: string }[];
  sufixo?: string;
  vazio?: string;
  tom?: 0 | 1 | 2;
}) {
  const max = Math.max(1, ...itens.map((x) => x.valor));
  return (
    <Cartao
      titulo={titulo}
      descricao={descricao}
      tabela={
        itens.length ? (
          <TabelaDados rotulos={itens.map((x) => x.rotulo)} series={[{ nome: "Valor", valores: itens.map((x) => x.valor) }]} sufixo={sufixo} />
        ) : undefined
      }
    >
      {itens.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">{vazio}</p>
      ) : (
        <ul className="space-y-2">
          {itens.map((x) => (
            <li key={x.rotulo} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate" title={x.rotulo}>
                  {x.rotulo}
                </span>
                <span className="shrink-0 font-medium tabular-nums">
                  {fmt(x.valor)}
                  {sufixo}
                  {x.detalhe ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">{x.detalhe}</span> : null}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full", COR[tom].ponto)} style={{ width: `${Math.max(2, (x.valor / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}

export function Indicador({ rotulo, valor, detalhe, tom }: { rotulo: string; valor: string; detalhe?: string; tom?: "bom" | "atencao" }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{rotulo}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", tom === "atencao" && "text-amber-600 dark:text-amber-400", tom === "bom" && "text-emerald-600 dark:text-emerald-400")}>{valor}</p>
      {detalhe ? <p className="mt-0.5 text-xs text-muted-foreground">{detalhe}</p> : null}
    </div>
  );
}
