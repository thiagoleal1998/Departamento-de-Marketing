"use client";

import { useMemo, useState } from "react";
import { BarrasHorizontais, GraficoColunas } from "./graficos";
import { Select } from "@/components/ui/select";

/** Uma tarefa com solicitante informado. `mes` = mês da criação da tarefa (aaaa-mm), no horário de Brasília. */
export interface LinhaSolicitacao {
  mes: string;
  solicitante: string;
  area: string;
  aberta: boolean;
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONGOS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const rotuloCurto = (m: string) => `${MESES[Number(m.slice(5)) - 1]}/${m.slice(2, 4)}`;
const rotuloLongo = (m: string) => `${MESES_LONGOS[Number(m.slice(5)) - 1]} de ${m.slice(0, 4)}`;

function ranking(linhas: LinhaSolicitacao[], chave: (l: LinhaSolicitacao) => string, max: number) {
  const m = new Map<string, { total: number; abertas: number }>();
  for (const l of linhas) {
    const x = m.get(chave(l)) ?? { total: 0, abertas: 0 };
    x.total++;
    if (l.aberta) x.abertas++;
    m.set(chave(l), x);
  }
  return Array.from(m.entries())
    .sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0], "pt-BR"))
    .slice(0, max)
    .map(([rotulo, v]) => ({ rotulo, valor: v.total, detalhe: `${v.abertas} aberta(s)` }));
}

/** "Quem solicita": por pessoa, por área e por mês, com filtro de mês. */
export function QuemSolicita({ linhas, total, semColuna }: { linhas: LinhaSolicitacao[]; total: number; semColuna: boolean }) {
  const [mes, setMes] = useState("");
  const meses = useMemo(() => Array.from(new Set(linhas.map((l) => l.mes))).sort(), [linhas]);
  const filtradas = useMemo(() => (mes ? linhas.filter((l) => l.mes === mes) : linhas), [linhas, mes]);
  const porPessoa = useMemo(() => ranking(filtradas, (l) => l.solicitante, 10), [filtradas]);
  const porArea = useMemo(() => ranking(filtradas, (l) => l.area, 8), [filtradas]);

  // Mês a mês, sempre sobre todos os meses (o filtro não esconde a evolução).
  const porMes = useMemo(() => {
    const c = new Map<string, number>();
    for (const l of linhas) c.set(l.mes, (c.get(l.mes) ?? 0) + 1);
    const ordem = Array.from(c.keys()).sort().slice(-12);
    return { rotulos: ordem.map(rotuloCurto), valores: ordem.map((m) => c.get(m) ?? 0) };
  }, [linhas]);

  const periodo = mes ? rotuloLongo(mes) : "todos os meses";

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-3">
        <h2 className="text-base font-semibold">Quem solicita</h2>
        {meses.length > 0 ? (
          <Select value={mes} onChange={(e) => setMes(e.target.value)} aria-label="Mês" className="h-9 px-3">
            <option value="">Todos os meses</option>
            {[...meses].reverse().map((m) => (
              <option key={m} value={m}>
                {rotuloLongo(m)}
              </option>
            ))}
          </Select>
        ) : null}
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        {semColuna ? (
          "O campo Solicitante ainda não foi ativado no banco (falta rodar a migration 0086)."
        ) : (
          <>
            Vem do campo <strong>Solicitante</strong> das tarefas, agrupado pelo mês em que a tarefa foi criada. <strong>{linhas.length}</strong> de <strong>{total}</strong> tarefa(s) têm solicitante informado
            {linhas.length < total ? ": o campo é novo, então os gráficos se completam à medida que as tarefas são criadas ou editadas com o solicitante." : "."}
          </>
        )}
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <BarrasHorizontais
          titulo="Quem mais pede tarefas"
          descricao={`Tarefas por solicitante em ${periodo} (os 10 que mais pedem), com quantas ainda estão abertas.`}
          itens={porPessoa}
          vazio={mes ? "Nenhuma tarefa com solicitante neste mês." : "Ainda não há tarefas com solicitante informado."}
        />
        <BarrasHorizontais
          titulo="De qual área vêm os pedidos"
          descricao={`Tarefas por área do solicitante em ${periodo}. Reuniões aparecem como uma área própria.`}
          itens={porArea}
          tom={2}
          vazio={mes ? "Nenhuma tarefa com solicitante neste mês." : "Ainda não há tarefas com solicitante informado."}
        />
        {porMes.rotulos.length > 0 ? (
          <div className="lg:col-span-2">
            <GraficoColunas
              titulo="Pedidos por mês"
              descricao="Quantas tarefas com solicitante informado foram criadas em cada mês."
              rotulos={porMes.rotulos}
              series={[{ nome: "Tarefas com solicitante", valores: porMes.valores }]}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
