import { Card, CardContent } from "@/components/ui/card";
import type { Relatorio } from "./relatorios-calculo";

function Barra({ valor, max, cor = "bg-primary" }: { valor: number; max: number; cor?: string }) {
  const pct = max > 0 ? Math.max(2, Math.round((valor / max) * 100)) : 0;
  return (
    <div className="h-2 w-full rounded bg-muted">
      <div className={`h-2 rounded ${cor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Indicador({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <Card>
      <CardContent className="space-y-0.5 p-4">
        <p className="text-xs text-muted-foreground">{rotulo}</p>
        <p className="text-2xl font-semibold">{valor}</p>
        {detalhe ? <p className="text-xs text-muted-foreground">{detalhe}</p> : null}
      </CardContent>
    </Card>
  );
}

const fmt = (n: number, casas = 1) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{titulo}</h2>
        {descricao ? <p className="text-sm text-muted-foreground">{descricao}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Relatórios das atas: frequência, alterações de demanda e motivos. */
export function Relatorios({ r }: { r: Relatorio }) {
  const d = r.demandas;
  const maxPessoa = Math.max(1, ...r.adiamentosPorPessoa.map((p) => p[1]));
  const maxMotivo = Math.max(1, ...r.motivos.map((m) => m[1]));
  const maxTipo = Math.max(1, ...r.porTipo.map((t) => t.total));
  const pctAdiados = d.total > 0 ? (d.comAdiamento / d.total) * 100 : 0;

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador rotulo="Reuniões realizadas" valor={String(r.reunioes)} />
        <Indicador
          rotulo="Demandas (assuntos)"
          valor={String(d.total)}
          detalhe={`${d.concluidas} finalizadas · ${d.abertas} abertas · ${d.canceladas} canceladas`}
        />
        <Indicador
          rotulo="Demandas que mudaram de prazo"
          valor={`${fmt(pctAdiados, 0)}%`}
          detalhe={`${d.comAdiamento} de ${d.total} · ${d.adiamentos} adiamentos`}
        />
        <Indicador
          rotulo="Adiamento médio"
          valor={`${fmt(d.mediaDiasAdiados, 0)} dias`}
          detalhe={
            d.mediaReunioesAteConcluir
              ? `Finalizam em média em ${fmt(d.mediaReunioesAteConcluir)} reuniões`
              : undefined
          }
        />
      </div>

      <Secao
        titulo="Frequência nas reuniões"
        descricao="Frequência pela quantidade de presenças: presenças ÷ reuniões em que a pessoa consta na lista (dispensas, ausências e afastamentos contam como não presença; ex-integrantes ficam de fora)."
      >
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Pessoa</th>
                  <th className="px-4 py-2 text-center font-medium">Presenças</th>
                  <th className="px-4 py-2 text-center font-medium">Ausente</th>
                  <th className="px-4 py-2 text-center font-medium">Dispensado</th>
                  <th className="px-4 py-2 text-center font-medium">Afastado</th>
                  <th className="min-w-[160px] px-4 py-2 font-medium">Frequência</th>
                  <th className="px-4 py-2 font-medium">Principais motivos de ausência</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {r.frequencia.map((f) => (
                  <tr key={f.nome}>
                    <td className="px-4 py-2 font-medium">
                      {f.nome}
                      {f.afastamento > 0 ? (
                        <span className="ml-2 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-normal text-amber-700">
                          afastada(o){f.afastadoDesde ? ` desde ${f.afastadoDesde.split("-").reverse().join("/")}` : ""} · {f.afastamento} reuniões
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 text-center font-medium">
                      {f.presente}
                      <span className="font-normal text-muted-foreground"> de {f.total}</span>
                    </td>
                    <td className="px-4 py-2 text-center">{f.ausente}</td>
                    <td className="px-4 py-2 text-center">{f.dispensado}</td>
                    <td className="px-4 py-2 text-center">{f.afastamento}</td>
                    <td className="px-4 py-2">
                      {f.pct === null ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Barra
                            valor={f.pct}
                            max={100}
                            cor={f.pct >= 85 ? "bg-emerald-500" : f.pct >= 60 ? "bg-amber-500" : "bg-red-500"}
                          />
                          <span className="w-12 shrink-0 text-right text-xs">{fmt(f.pct, 0)}%</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {f.motivosAusencia.length > 0
                        ? f.motivosAusencia.map(([m, n]) => `${m} (${n})`).join(" · ")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </Secao>

      <div className="grid gap-6 lg:grid-cols-2">
        <Secao
          titulo="Principais motivos de alteração"
          descricao="Motivo informado nos itens da ata. Registrar o motivo ao adiar ou mudar o andamento alimenta este gráfico."
        >
          <Card>
            <CardContent className="space-y-3 p-4">
              {r.motivos.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ainda não há motivos registrados (o histórico importado não tinha esse campo). A partir das
                  próximas atas, escolha o motivo no item.
                </p>
              ) : (
                r.motivos.map(([m, n]) => (
                  <div key={m} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{m}</span>
                      <span className="font-medium">{n}</span>
                    </div>
                    <Barra valor={n} max={maxMotivo} />
                  </div>
                ))
              )}
              <p className="border-t pt-2 text-xs text-muted-foreground">
                Adiamentos sem motivo informado: <strong>{r.adiamentosSemMotivo}</strong>
              </p>
            </CardContent>
          </Card>
        </Secao>

        <Secao titulo="Adiamentos por responsável" descricao="Quantas vezes o prazo de demandas de cada pessoa foi empurrado.">
          <Card>
            <CardContent className="space-y-3 p-4">
              {r.adiamentosPorPessoa.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum adiamento encontrado.</p>
              ) : (
                r.adiamentosPorPessoa.map(([nome, n]) => (
                  <div key={nome} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{nome}</span>
                      <span className="font-medium">{n}</span>
                    </div>
                    <Barra valor={n} max={maxPessoa} cor="bg-amber-500" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </Secao>
      </div>

      <Secao titulo="Demandas por tipo" descricao="Tipo de demanda (campo do item ou sugerido pelo título).">
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="min-w-[160px] px-4 py-2 font-medium">Demandas</th>
                  <th className="px-4 py-2 text-center font-medium">Finalizadas</th>
                  <th className="px-4 py-2 text-center font-medium">Adiamentos</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {r.porTipo.map((t) => (
                  <tr key={t.tipo}>
                    <td className="px-4 py-2">{t.tipo}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Barra valor={t.total} max={maxTipo} />
                        <span className="w-8 shrink-0 text-right text-xs">{t.total}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">{t.concluidas}</td>
                    <td className="px-4 py-2 text-center">{t.adiamentos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </Secao>

      <Secao
        titulo="Demandas que mais se repetem ou foram adiadas"
        descricao="Assuntos com adiamentos ou presentes em 4 ou mais reuniões."
      >
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Demanda</th>
                  <th className="px-4 py-2 font-medium">Responsável</th>
                  <th className="px-4 py-2 text-center font-medium">Reuniões</th>
                  <th className="px-4 py-2 text-center font-medium">Adiamentos</th>
                  <th className="px-4 py-2 text-center font-medium">Dias adiados</th>
                  <th className="px-4 py-2 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {r.maisAdiados.map((i) => (
                  <tr key={i.titulo}>
                    <td className="px-4 py-2 font-medium">{i.titulo}</td>
                    <td className="px-4 py-2">{i.responsavel}</td>
                    <td className="px-4 py-2 text-center">{i.reunioes}</td>
                    <td className="px-4 py-2 text-center">{i.adiamentos}</td>
                    <td className="px-4 py-2 text-center">{i.diasAdiados}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {i.situacao === "concluido" ? "Finalizada" : i.situacao === "cancelado" ? "Cancelada" : "Em aberto"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </Secao>
    </div>
  );
}
