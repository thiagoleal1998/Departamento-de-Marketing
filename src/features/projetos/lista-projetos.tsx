import Link from "@/components/shared/link";
import { Plus, FolderKanban, CalendarRange } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { listarProjetos } from "@/features/projetos/data";
import {
  TEXTOS_PROJETO,
  categoriaPorValor,
  type CategoriaMeta,
} from "@/features/projetos/categorias";
import { mapaDePerfis } from "@/features/chamados/data";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatarData } from "@/lib/utils";
import { PROJETO_STATUS_META } from "@/types";

/** Lista de projetos, geral ou filtrada por categoria. */
export async function ListaProjetos({
  categoria,
}: {
  categoria?: CategoriaMeta;
}) {
  const usuario = await exigirUsuario();
  const lideranca = ehLideranca(usuario.role);
  const [projetos, perfis] = await Promise.all([
    listarProjetos(categoria?.valor),
    mapaDePerfis(),
  ]);
  const textos = categoria?.textos ?? TEXTOS_PROJETO;
  const novoHref = categoria
    ? `/projetos/novo?categoria=${categoria.valor}`
    : "/projetos/novo";

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={categoria ? categoria.label : "Projetos"}
        descricao={
          categoria
            ? categoria.descricao
            : "Projetos maiores (eventos, famtours, VT's e ações) organizados por etapas."
        }
        acoes={
          lideranca ? (
            <Button asChild>
              <Link href={novoHref}>
                <Plus className="size-4" /> {textos.novo}
              </Link>
            </Button>
          ) : undefined
        }
      />

      {projetos.length === 0 ? (
        <EmptyState
          icone={FolderKanban}
          titulo={textos.nenhum}
          descricao={`${textos.criar} para organizar o trabalho em etapas, com documentos e comparativos.`}
          acao={
            lideranca ? (
              <Button asChild>
                <Link href={novoHref}>{textos.novo}</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projetos.map((p) => (
            <Link key={p.id} href={`/projetos/${p.id}`}>
              <Card className="h-full overflow-hidden transition-colors hover:border-primary/40 hover:bg-accent/30">
                {p.capa_url || p.logo_parceiro_url ? (
                  <div className="relative h-32 overflow-hidden bg-muted">
                    {p.capa_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.capa_url} alt="" className="size-full object-cover" />
                    ) : null}
                    {p.logo_parceiro_url ? (
                      <div className={p.capa_url ? "absolute bottom-2 left-2 rounded-lg bg-white p-1.5 shadow" : "size-full bg-white p-4"}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.logo_parceiro_url} alt="" className={p.capa_url ? "h-8 max-w-28 object-contain" : "size-full object-contain"} />
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-tight">{p.nome}</h3>
                    <Badge variant={PROJETO_STATUS_META[p.status].variant}>
                      {PROJETO_STATUS_META[p.status].label}
                    </Badge>
                  </div>
                  {!categoria ? (
                    <Badge variant="outline">
                      {categoriaPorValor(p.categoria)?.label ?? p.categoria}
                    </Badge>
                  ) : null}
                  {p.descricao ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {p.descricao}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {p.responsavel_id
                        ? perfis.get(p.responsavel_id)?.nome ?? "—"
                        : "Sem responsável"}
                    </span>
                    {p.data_inicio || p.data_fim ? (
                      <span className="flex items-center gap-1">
                        <CalendarRange className="size-3" />
                        {formatarData(p.data_inicio)} – {formatarData(p.data_fim)}
                      </span>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
