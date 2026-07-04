import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ListChecks,
  Plus,
  X,
  CalendarRange,
  FileText,
  Scale,
  Upload,
  ExternalLink,
} from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import {
  obterProjeto,
  listarEtapas,
  listarDocumentos,
  listarComparativos,
} from "@/features/projetos/data";
import { mapaDePerfis } from "@/features/chamados/data";
import { listarColaboradores } from "@/features/desenvolvimento/data";
import {
  adicionarEtapa,
  removerEtapa,
  adicionarDocumento,
  removerDocumento,
  adicionarComparativo,
  removerComparativo,
} from "@/features/projetos/actions";
import { EtapaStatusControl } from "@/features/projetos/etapa-status-control";
import { ProjetoStatusControl } from "@/features/projetos/projeto-status-control";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DateInputBR } from "@/components/ui/date-input-br";
import { FileInputBR } from "@/components/ui/file-input-br";
import { formatarData, formatarMoeda, cn } from "@/lib/utils";
import { PROJETO_STATUS_META } from "@/types";

export const dynamic = "force-dynamic";

export default async function ProjetoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuario = await exigirUsuario();
  const projeto = await obterProjeto(id);
  if (!projeto) notFound();

  const lideranca = ehLideranca(usuario.role);
  const [etapas, documentos, comparativos, perfis, pessoas] = await Promise.all([
    listarEtapas(id),
    listarDocumentos(id),
    listarComparativos(id),
    mapaDePerfis(),
    lideranca ? listarColaboradores() : Promise.resolve([]),
  ]);

  // Menor e maior valor por item (para destacar preço no comparativo).
  const valoresPorItem = new Map<string, number[]>();
  for (const c of comparativos) {
    if (c.valor == null) continue;
    const arr = valoresPorItem.get(c.item) ?? [];
    arr.push(c.valor);
    valoresPorItem.set(c.item, arr);
  }
  const minPorItem = new Map<string, number>();
  const maxPorItem = new Map<string, number>();
  for (const [item, vals] of valoresPorItem) {
    minPorItem.set(item, Math.min(...vals));
    maxPorItem.set(item, Math.max(...vals));
  }

  const concluidas = etapas.filter((e) => e.status === "concluida").length;
  const progresso =
    etapas.length > 0 ? Math.round((concluidas / etapas.length) * 100) : 0;
  const responsavel = projeto.responsavel_id
    ? perfis.get(projeto.responsavel_id)
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={projeto.nome}
        descricao="Acompanhe as etapas do projeto."
        acoes={
          <Button asChild variant="outline">
            <Link href="/projetos">
              <ArrowLeft className="size-4" /> Voltar
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Conteúdo do projeto */}
        <div className="space-y-4 lg:col-span-2">
          <Tabs defaultValue="etapas">
            <TabsList>
              <TabsTrigger value="etapas">Etapas</TabsTrigger>
              <TabsTrigger value="documentos">Documentos</TabsTrigger>
              <TabsTrigger value="comparativos">Comparativos</TabsTrigger>
            </TabsList>

            <TabsContent value="etapas">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <ListChecks className="size-4" /> Etapas
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {concluidas}/{etapas.length} concluídas
              </span>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progresso */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progresso}%` }}
                />
              </div>

              {etapas.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nenhuma etapa ainda. Adicione a primeira abaixo.
                </p>
              ) : (
                <ul className="space-y-2">
                  {etapas.map((e) => (
                    <li
                      key={e.id}
                      className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{e.titulo}</p>
                        {e.descricao ? (
                          <p className="text-xs text-muted-foreground">
                            {e.descricao}
                          </p>
                        ) : null}
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {e.responsavel_id
                            ? perfis.get(e.responsavel_id)?.nome ?? "—"
                            : "Sem responsável"}
                          {e.prazo ? ` · prazo ${formatarData(e.prazo)}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <EtapaStatusControl
                          etapaId={e.id}
                          status={e.status}
                          podeEditar={lideranca}
                        />
                        {lideranca ? (
                          <form action={removerEtapa.bind(null, id)}>
                            <input type="hidden" name="etapa_id" value={e.id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              title="Remover etapa"
                            >
                              <X className="size-4" />
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Adicionar etapa */}
              {lideranca ? (
                <form
                  action={adicionarEtapa.bind(null, id)}
                  className="space-y-3 border-t pt-4"
                >
                  <p className="text-sm font-medium">Nova etapa</p>
                  <Input
                    name="titulo"
                    placeholder="Ex.: Contratação de stand"
                    required
                  />
                  <Textarea
                    name="descricao"
                    rows={2}
                    placeholder="Detalhes da etapa (opcional)"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select name="responsavel_id" defaultValue="">
                      <option value="">Sem responsável</option>
                      {pessoas.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </Select>
                    <DateInputBR name="prazo" />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" size="sm">
                      <Plus className="size-4" /> Adicionar etapa
                    </Button>
                  </div>
                </form>
              ) : null}
            </CardContent>
          </Card>
            </TabsContent>

            {/* Documentos */}
            <TabsContent value="documentos">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="size-4" /> Documentos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {documentos.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      Nenhum documento ainda.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {documentos.map((d) => (
                        <li
                          key={d.id}
                          className="flex items-center justify-between gap-2 rounded-lg border p-3"
                        >
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex min-w-0 items-center gap-2 text-sm font-medium text-primary hover:underline"
                          >
                            <FileText className="size-4 shrink-0" />
                            <span className="truncate">{d.nome}</span>
                            <ExternalLink className="size-3 shrink-0" />
                          </a>
                          {lideranca ? (
                            <form action={removerDocumento.bind(null, id)}>
                              <input type="hidden" name="doc_id" value={d.id} />
                              <Button
                                type="submit"
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                title="Remover documento"
                              >
                                <X className="size-4" />
                              </Button>
                            </form>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                  {lideranca ? (
                    <form
                      action={adicionarDocumento.bind(null, id)}
                      className="space-y-3 border-t pt-4"
                    >
                      <p className="text-sm font-medium">Adicionar documento</p>
                      <Input name="nome" placeholder="Nome do documento" />
                      <Input
                        name="url"
                        type="url"
                        placeholder="Cole um link (Google Drive, etc.)"
                      />
                      <FileInputBR name="arquivo" />
                      <p className="text-xs text-muted-foreground">
                        Envie um arquivo (até 30 MB) OU informe um link.
                      </p>
                      <div className="flex justify-end">
                        <Button type="submit" size="sm">
                          <Plus className="size-4" /> Adicionar
                        </Button>
                      </div>
                    </form>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Comparativos */}
            <TabsContent value="comparativos">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Scale className="size-4" /> Comparativos de custo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Compare fornecedores por item (stand, brindes, etc.). O menor
                    valor de cada item fica em verde; o maior, em vermelho.
                  </p>
                  {comparativos.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      Nenhum comparativo ainda.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground">
                            <th className="py-2 pr-2">Item</th>
                            <th className="pr-2">Fornecedor</th>
                            <th className="pr-2 text-right">Valor</th>
                            <th className="pr-2">Obs.</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {comparativos.map((c) => {
                            const min = minPorItem.get(c.item);
                            const max = maxPorItem.get(c.item);
                            const isMin = c.valor != null && c.valor === min;
                            const isMax =
                              c.valor != null &&
                              c.valor === max &&
                              min !== max;
                            return (
                              <tr key={c.id} className="border-b last:border-0">
                                <td className="py-2 pr-2 font-medium">
                                  {c.item}
                                </td>
                                <td className="pr-2">{c.fornecedor}</td>
                                <td
                                  className={cn(
                                    "pr-2 text-right font-medium tabular-nums",
                                    isMin && "text-emerald-600",
                                    isMax && "text-destructive"
                                  )}
                                >
                                  {formatarMoeda(c.valor)}
                                </td>
                                <td className="pr-2 text-xs text-muted-foreground">
                                  {c.observacao ?? ""}
                                </td>
                                <td>
                                  {lideranca ? (
                                    <form
                                      action={removerComparativo.bind(null, id)}
                                    >
                                      <input
                                        type="hidden"
                                        name="comp_id"
                                        value={c.id}
                                      />
                                      <Button
                                        type="submit"
                                        variant="ghost"
                                        size="icon"
                                        className="size-7"
                                        title="Remover"
                                      >
                                        <X className="size-3.5" />
                                      </Button>
                                    </form>
                                  ) : null}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {lideranca ? (
                    <form
                      action={adicionarComparativo.bind(null, id)}
                      className="grid gap-2 border-t pt-4 sm:grid-cols-4"
                    >
                      <Input name="item" placeholder="Item (ex.: Stand)" required />
                      <Input name="fornecedor" placeholder="Fornecedor" required />
                      <Input name="valor" inputMode="decimal" placeholder="Valor (R$)" />
                      <Input name="observacao" placeholder="Observação" />
                      <div className="flex justify-end sm:col-span-4">
                        <Button type="submit" size="sm">
                          <Plus className="size-4" /> Adicionar comparativo
                        </Button>
                      </div>
                    </form>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Lateral */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Situação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lideranca ? (
                <ProjetoStatusControl
                  projetoId={id}
                  status={projeto.status}
                />
              ) : (
                <Badge variant={PROJETO_STATUS_META[projeto.status].variant}>
                  {PROJETO_STATUS_META[projeto.status].label}
                </Badge>
              )}
              <div className="text-sm">
                <p className="text-xs text-muted-foreground">Responsável</p>
                <p className="font-medium">{responsavel?.nome ?? "—"}</p>
              </div>
              {projeto.data_inicio || projeto.data_fim ? (
                <div className="text-sm">
                  <p className="text-xs text-muted-foreground">Período</p>
                  <p className="flex items-center gap-1 font-medium">
                    <CalendarRange className="size-3.5" />
                    {formatarData(projeto.data_inicio)} –{" "}
                    {formatarData(projeto.data_fim)}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {projeto.descricao ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Descrição</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-foreground/90">
                  {projeto.descricao}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
