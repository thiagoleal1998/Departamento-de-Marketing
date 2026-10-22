import { dataBr, moeda, type Cotacao } from "./tipos";

const CORES = ["#2563eb", "#16a34a", "#d97706", "#9333ea", "#dc2626", "#0891b2", "#be185d", "#4d7c0f"];

const DIA = 86_400_000;
const t = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return Date.UTC(a, m - 1, d);
};

/** Gráfico de linhas: valor unitário cotado ao longo do tempo, uma linha por fornecedor. Anel = compra feita. */
export function GraficoPrecos({ cotacoes }: { cotacoes: Cotacao[] }) {
  if (cotacoes.length === 0) return null;

  const W = 640;
  const H = 240;
  const ML = 64;
  const MR = 16;
  const MT = 14;
  const MB = 30;

  const nomes = Array.from(new Set(cotacoes.map((c) => c.fornecedor_nome))).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const cor = (n: string) => CORES[nomes.indexOf(n) % CORES.length];

  const valores = cotacoes.map((c) => c.valor_unitario);
  let min = Math.min(...valores);
  let max = Math.max(...valores);
  if (min === max) {
    min = Math.max(0, min - 1);
    max = max + 1;
  }
  const folga = (max - min) * 0.12;
  const y0 = Math.max(0, min - folga);
  const y1 = max + folga;

  const tempos = cotacoes.map((c) => t(c.data_cotacao));
  let x0 = Math.min(...tempos);
  let x1 = Math.max(...tempos);
  if (x0 === x1) {
    x0 -= 15 * DIA;
    x1 += 15 * DIA;
  }
  const X = (ms: number) => ML + ((ms - x0) / (x1 - x0)) * (W - ML - MR);
  const Y = (v: number) => MT + (1 - (v - y0) / (y1 - y0)) * (H - MT - MB);

  const ticksY = [0, 1, 2, 3].map((i) => y0 + ((y1 - y0) * i) / 3);
  const ticksX = [0, 1, 2, 3].map((i) => x0 + ((x1 - x0) * i) / 3);
  const fmtData = (ms: number) => {
    const d = new Date(ms);
    return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${String(d.getUTCFullYear()).slice(2)}`;
  };

  const melhor = cotacoes.reduce((a, b) => (b.valor_unitario < a.valor_unitario ? b : a));

  return (
    <figure className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Valor unitário cotado ao longo do tempo, por fornecedor" className="h-auto w-full">
        {ticksY.map((v, i) => (
          <g key={i}>
            <line x1={ML} x2={W - MR} y1={Y(v)} y2={Y(v)} stroke="currentColor" opacity={0.12} />
            <text x={ML - 8} y={Y(v) + 4} textAnchor="end" fontSize={11} fill="currentColor" opacity={0.65}>
              {moeda(v)}
            </text>
          </g>
        ))}
        {ticksX.map((ms, i) => (
          <text key={i} x={X(ms)} y={H - 8} textAnchor={i === 0 ? "start" : i === ticksX.length - 1 ? "end" : "middle"} fontSize={11} fill="currentColor" opacity={0.65}>
            {fmtData(ms)}
          </text>
        ))}

        {nomes.map((n) => {
          const pts = cotacoes
            .filter((c) => c.fornecedor_nome === n)
            .sort((a, b) => a.data_cotacao.localeCompare(b.data_cotacao));
          return (
            <g key={n}>
              {pts.length > 1 ? (
                <polyline
                  points={pts.map((c) => `${X(t(c.data_cotacao))},${Y(c.valor_unitario)}`).join(" ")}
                  fill="none"
                  stroke={cor(n)}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
              ) : null}
              {pts.map((c) => (
                <g key={c.id}>
                  {c.contratado ? <circle cx={X(t(c.data_cotacao))} cy={Y(c.valor_unitario)} r={9} fill="none" stroke={cor(n)} strokeWidth={2} /> : null}
                  <circle cx={X(t(c.data_cotacao))} cy={Y(c.valor_unitario)} r={4.5} fill={cor(n)} stroke="var(--grafico-borda, #fff)" strokeWidth={1.5}>
                    <title>{`${n} — ${dataBr(c.data_cotacao)}: ${moeda(c.valor_unitario)}${c.contratado ? " (contratado)" : ""}`}</title>
                  </circle>
                </g>
              ))}
            </g>
          );
        })}
      </svg>

      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {nomes.map((n) => (
          <span key={n} className="inline-flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full" style={{ background: cor(n) }} /> {n}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-full border-2 border-current" /> compra feita
        </span>
        <span className="ml-auto font-medium text-foreground">
          Menor preço: {moeda(melhor.valor_unitario)} ({melhor.fornecedor_nome}, {dataBr(melhor.data_cotacao)})
        </span>
      </figcaption>
    </figure>
  );
}
