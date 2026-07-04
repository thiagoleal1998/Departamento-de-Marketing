export interface BarraDado {
  label: string;
  valor: number;
}

/**
 * Gráfico de barras horizontais (série única = magnitude).
 * Uma cor só (primária da marca); a categoria é identificada pelo rótulo.
 */
export function BarChartH({ dados }: { dados: BarraDado[] }) {
  if (dados.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Sem dados no período.
      </p>
    );
  }
  const max = Math.max(1, ...dados.map((d) => d.valor));

  return (
    <div className="space-y-2.5">
      {dados.map((d) => (
        <div
          key={d.label}
          className="grid grid-cols-[8rem_1fr_2.5rem] items-center gap-3 text-sm"
          title={`${d.label}: ${d.valor}`}
        >
          <span className="truncate text-muted-foreground">{d.label}</span>
          <div className="h-2.5 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${(d.valor / max) * 100}%`,
                minWidth: d.valor > 0 ? "0.5rem" : 0,
              }}
            />
          </div>
          <span className="text-right font-medium tabular-nums">{d.valor}</span>
        </div>
      ))}
    </div>
  );
}
