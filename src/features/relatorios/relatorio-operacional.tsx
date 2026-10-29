import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { dadosOperacional } from "./operacional";
import { BarrasHorizontais, Cartao, GraficoColunas, GraficoLinhas, Indicador } from "./graficos";
import { QuemSolicita } from "./quem-solicita";
import { cn } from "@/lib/utils";

const dec = (v: number, casas = 1) => v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

/** Aba "Evolução do operacional": como o time está entregando e onde corrigir o rumo. */
export async function RelatorioOperacional() {
  const d = await dadosOperacional();
  const r = d.relatorioAtas;
  const semAtas = d.reunioes.length === 0;
  const quando = new Date(d.geradoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        Reúne as <strong className="text-foreground">tarefas do quadro</strong> e as <strong className="text-foreground">atas das reuniões</strong>. Atualizado em {quando}.
        Passe o mouse nos gráficos para ver os valores; em cada um há a versão em tabela.
      </p>

      {/* Leitura rápida */}
      <section className="space-y-2 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Leitura rápida</h2>
        {d.insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda não há reuniões suficientes para comparar períodos.</p>
        ) : (
          <ul className="space-y-1.5">
            {d.insights.map((x, i) => {
              const Icone = x.tom === "bom" ? CheckCircle2 : x.tom === "atencao" ? AlertTriangle : Info;
              return (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Icone
                    className={cn("mt-0.5 size-4 shrink-0", x.tom === "bom" && "text-emerald-600 dark:text-emerald-400", x.tom === "atencao" && "text-amber-600 dark:text-amber-400", x.tom === "neutro" && "text-muted-foreground")}
                    aria-hidden
                  />
                  <span>{x.texto}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Indicadores */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Indicador rotulo="Tarefas abertas" valor={String(d.kpis.tarefasAbertas)} detalhe="no quadro, hoje" />
        <Indicador rotulo="Tarefas atrasadas" valor={String(d.kpis.atrasadas)} detalhe="prazo já passou" tom={d.kpis.atrasadas > 0 ? "atencao" : "bom"} />
        <Indicador rotulo="Esperando aprovação" valor={String(d.kpis.emAprovacao)} detalhe={d.aprovacaoPorPessoa.map((x) => `${x.rotulo.replace("Aprovação do ", "").replace(" (voltaram para o time)", "")} ${x.valor}`).join(" · ") || "aprovação ou alterações"} tom={d.kpis.emAprovacao > 5 ? "atencao" : undefined} />
        <Indicador rotulo="Reuniões até concluir" valor={d.kpis.mediaReunioesAteConcluir !== null ? dec(d.kpis.mediaReunioesAteConcluir) : "—"} detalhe="média por demanda da ata" />
        <Indicador rotulo="Concluídos na última ata" valor={d.kpis.pctConcluidosUltima !== null ? `${dec(d.kpis.pctConcluidosUltima, 0)}%` : "—"} detalhe="dos itens da reunião" />
        <Indicador rotulo="Adiados (últimas 4 atas)" valor={d.kpis.pctAdiadosUltimas4 !== null ? `${dec(d.kpis.pctAdiadosUltimas4, 0)}%` : "—"} detalhe="itens com prazo empurrado" />
      </div>

      {/* Evolução */}
      <div>
        <h2 className="mb-3 text-base font-semibold">Evolução</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {semAtas ? null : (
            <>
              <GraficoLinhas
                titulo="Itens da ata por reunião"
                descricao="Em aberto e novos em cada reunião. Se os abertos caem, o time está concluindo mais do que entra."
                rotulos={d.reunioes.map((x) => x.rotulo)}
                series={[
                  { nome: "Em aberto", valores: d.reunioes.map((x) => x.abertos) },
                  { nome: "Novos no assunto", valores: d.reunioes.map((x) => x.novos) },
                ]}
              />
              <GraficoLinhas
                titulo="Conclusão e adiamento por reunião"
                descricao="Percentual dos itens da ata que estavam concluídos e dos que tiveram o prazo empurrado."
                rotulos={d.reunioes.map((x) => x.rotulo)}
                series={[
                  { nome: "Concluídos", valores: d.reunioes.map((x) => Math.round(x.pctConcluidos)) },
                  { nome: "Prazo adiado", valores: d.reunioes.map((x) => Math.round(x.pctAdiados)) },
                ]}
                sufixo="%"
                maxFixo={100}
              />
            </>
          )}
          <GraficoColunas
            titulo="Tarefas criadas por mês"
            descricao="Entrada de demandas no quadro e quantas dessas já foram concluídas."
            rotulos={d.meses.map((m) => m.rotulo)}
            series={[
              { nome: "Criadas", valores: d.meses.map((m) => m.criadas) },
              { nome: "Já concluídas", valores: d.meses.map((m) => m.concluidas) },
            ]}
          />
          <GraficoLinhas
            titulo="Prazo médio combinado nas tarefas"
            descricao="Dias entre criar a tarefa e o prazo. Só entram meses com 3 ou mais tarefas com prazo."
            rotulos={d.meses.map((m) => m.rotulo)}
            series={[{ nome: "Dias", valores: d.meses.map((m) => (m.prazoMedioDias === null ? null : Math.round(m.prazoMedioDias * 10) / 10)) }]}
            casas={1}
          />
        </div>
      </div>

      {/* Quem solicita */}
      <QuemSolicita linhas={d.solicitantes.linhas} total={d.solicitantes.total} semColuna={d.solicitantes.semColuna} />

      {/* Pontos de correção */}
      <div>
        <h2 className="mb-3 text-base font-semibold">Pontos de correção</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <BarrasHorizontais
            titulo="Tarefas abertas por situação"
            descricao="Onde estão paradas as tarefas que ainda não foram concluídas."
            itens={d.statusAtual.map((s) => ({ rotulo: s.rotulo, valor: s.valor }))}
            vazio="Nenhuma tarefa aberta."
          />
          <BarrasHorizontais
            titulo="Esperando aprovação: de quem?"
            descricao="Em quais mãos está cada tarefa que aguarda aprovação ou voltou para alterações."
            itens={d.aprovacaoPorPessoa}
            tom={2}
            vazio="Nada esperando aprovação."
          />
          <BarrasHorizontais
            titulo="Tarefas atrasadas por pessoa"
            descricao="Quem concentra as tarefas com prazo vencido."
            itens={d.atrasadasPorPessoa.map(([rotulo, valor]) => ({ rotulo, valor }))}
            tom={1}
            vazio="Nenhuma tarefa atrasada."
          />
          {r ? (
            <>
              <BarrasHorizontais
                titulo="Por que os prazos são adiados"
                descricao="Motivos registrados nas atas."
                itens={r.motivos.slice(0, 8).map(([rotulo, valor]) => ({ rotulo, valor }))}
                tom={1}
                vazio="Nenhum motivo registrado."
              />
              <BarrasHorizontais
                titulo="Tipos de demanda que mais atrasam"
                descricao="Percentual de itens com adiamento em cada tipo (a partir de 3 itens)."
                itens={r.porTipo
                  .filter((t) => t.total >= 3 && t.adiamentos > 0)
                  .map((t) => ({ rotulo: t.tipo, valor: Math.round((t.adiamentos / t.total) * 100), detalhe: `${t.adiamentos} em ${t.total}` }))
                  .sort((a, b) => b.valor - a.valor)
                  .slice(0, 8)}
                sufixo="%"
                tom={1}
                vazio="Sem adiamentos por tipo."
              />
              <BarrasHorizontais
                titulo="Adiamentos por pessoa"
                descricao="Quantas vezes o prazo dos itens de cada pessoa foi empurrado."
                itens={r.adiamentosPorPessoa.slice(0, 8).map(([rotulo, valor]) => ({ rotulo, valor }))}
                tom={1}
                vazio="Nenhum adiamento registrado."
              />
              <BarrasHorizontais
                titulo="Demandas mais adiadas"
                descricao="Assuntos que mais passaram de reunião em reunião."
                itens={r.maisAdiados.slice(0, 8).map((x) => ({ rotulo: x.titulo, valor: x.adiamentos, detalhe: x.responsavel }))}
                tom={1}
                vazio="Nenhuma demanda adiada."
              />
            </>
          ) : null}
        </div>
      </div>

      {/* Listas objetivas */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao titulo="Tarefas atrasadas há mais tempo" descricao="As 10 com o prazo mais antigo.">
          {d.atrasadas.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">Nenhuma tarefa atrasada.</p>
          ) : (
            <ul className="divide-y text-sm">
              {d.atrasadas.slice(0, 10).map((t, i) => (
                <li key={i} className="flex items-start justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate font-medium" title={t.titulo}>
                      {t.titulo}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t.responsavel} · {t.status}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-medium text-amber-700 dark:text-amber-400">{t.dias} dia(s)</span>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
        <Cartao titulo="Esperando aprovação ou alterações" descricao="Tarefas paradas fora do ciclo de trabalho, da mais antiga para a mais nova.">
          {d.paradasEmAprovacao.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">Nada esperando aprovação.</p>
          ) : (
            <ul className="divide-y text-sm">
              {d.paradasEmAprovacao.slice(0, 10).map((t, i) => (
                <li key={i} className="flex items-start justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate font-medium" title={t.titulo}>
                      {t.titulo}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t.etapa} · tarefa de {t.responsavel}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">criada há {t.dias} dia(s)</span>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </div>
    </div>
  );
}
