import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  CATEGORIA_LABEL,
  MOTIVO_LABEL,
  STATUS_ITEM_LABEL,
  itemAberto,
  type ItemAta,
} from "./tipos";

const FUSO = "America/Sao_Paulo";

const dataHora = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("pt-BR", {
        timeZone: FUSO,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{rotulo}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

/** Visualização ampliada da ata: presença e todos os itens com os detalhes completos. */
export function VisaoAta({
  itens,
  presencas,
  nomePessoa,
}: {
  itens: ItemAta[];
  presencas: { nome: string; presenca: string; obs: string }[];
  nomePessoa: (id: string | null) => string | null;
}) {
  const abertos = itens.filter((i) => itemAberto(i.status)).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="font-semibold">Lista de presença</h2>
          {presencas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Presença não registrada.</p>
          ) : (
            <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {presencas.map((p) => (
                <li key={p.nome} className="flex items-baseline gap-2 text-sm">
                  <span className="font-medium">{p.nome}</span>
                  <Badge variant={/ausente/i.test(p.presenca) ? "danger" : /presente/i.test(p.presenca) ? "success" : "muted"}>
                    {p.presenca}
                  </Badge>
                  {p.obs ? <span className="truncate text-xs text-muted-foreground">{p.obs}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold">Itens da ata ({itens.length})</h2>
          <Badge variant="secondary">{abertos} em aberto</Badge>
        </div>

        {itens.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Esta ata ainda não tem itens.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {itens.map((it, n) => {
              const resp = nomePessoa(it.responsavel_id) ?? it.responsaveis_texto;
              return (
                <Card key={it.id}>
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-semibold leading-snug">
                        <span className="mr-2 text-muted-foreground">{n + 1}.</span>
                        {it.titulo}
                      </h3>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {it.prioridade ? <Badge variant="outline">P{it.prioridade}</Badge> : null}
                        <Badge variant={itemAberto(it.status) ? "secondary" : "outline"}>
                          {STATUS_ITEM_LABEL[it.status ?? "sem"]}
                        </Badge>
                      </div>
                    </div>

                    <dl className="grid gap-3 sm:grid-cols-2">
                      <Linha rotulo="Responsável">{resp ?? "—"}</Linha>
                      <Linha rotulo="Prazo">{dataHora(it.prazo)}</Linha>
                      {it.categoria ? <Linha rotulo="Tipo de demanda">{CATEGORIA_LABEL[it.categoria]}</Linha> : null}
                      {it.motivo ? <Linha rotulo="Motivo da alteração">{MOTIVO_LABEL[it.motivo]}</Linha> : null}
                    </dl>

                    {it.detalhamento ? (
                      <Linha rotulo="Detalhamento">
                        <span className="whitespace-pre-line">{it.detalhamento}</span>
                      </Linha>
                    ) : null}
                    {it.plano_acao ? (
                      <Linha rotulo="Plano de ação">
                        <span className="whitespace-pre-line">{it.plano_acao}</span>
                      </Linha>
                    ) : null}
                    {it.link ? (
                      <a
                        href={it.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        <ExternalLink className="size-3.5" /> Abrir link
                      </a>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
