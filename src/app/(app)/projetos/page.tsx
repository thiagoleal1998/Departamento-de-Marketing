import Link from "next/link";
import { Plus, FolderKanban, CalendarRange } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { listarProjetos } from "@/features/projetos/data";
import { mapaDePerfis } from "@/features/chamados/data";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatarData } from "@/lib/utils";
import { PROJETO_STATUS_META } from "@/types";

export const dynamic = "force-dynamic";

export default async function ProjetosPage() {
  const usuario = await exigirUsuario();
  const lideranca = ehLideranca(usuario.role);
  const [projetos, perfis] = await Promise.all([
    listarProjetos(),
    mapaDePerfis(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Projetos"
        descricao="Projetos maiores (eventos, ações) organizados por etapas."
        acoes={
          lideranca ? (
            <Button asChild>
              <Link href="/projetos/novo">
                <Plus className="size-4" /> Novo projeto
              </Link>
            </Button>
          ) : undefined
        }
      />

      {projetos.length === 0 ? (
        <EmptyState
          icone={FolderKanban}
          titulo="Nenhum projeto ainda"
          descricao="Crie um projeto para organizar eventos e trabalhos maiores em etapas (stand, locação, etc.)."
          acao={
            lideranca ? (
              <Button asChild>
                <Link href="/projetos/novo">Novo projeto</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projetos.map((p) => (
            <Link key={p.id} href={`/projetos/${p.id}`}>
              <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/30">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-tight">{p.nome}</h3>
                    <Badge variant={PROJETO_STATUS_META[p.status].variant}>
                      {PROJETO_STATUS_META[p.status].label}
                    </Badge>
                  </div>
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
