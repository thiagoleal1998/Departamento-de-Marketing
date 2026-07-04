import Link from "next/link";
import { Plus } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { listarChamados, mapaDePerfis } from "@/features/chamados/data";
import {
  ChamadosLista,
  type ChamadoView,
} from "@/features/chamados/chamados-lista";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ChamadosPage({
  searchParams,
}: {
  searchParams: Promise<{ situacao?: string }>;
}) {
  const usuario = await exigirUsuario();
  const { situacao } = await searchParams;
  const [chamados, perfis] = await Promise.all([
    listarChamados(),
    mapaDePerfis(),
  ]);

  const view: ChamadoView[] = chamados.map((c) => ({
    id: c.id,
    numero: c.numero,
    titulo: c.titulo,
    tipo: c.tipo,
    prioridade: c.prioridade,
    status: c.status,
    departamento: c.departamento,
    segmento: c.segmento,
    solicitante_nome:
      (c.solicitante_id ? perfis.get(c.solicitante_id)?.nome : null) ??
      c.solicitante_nome ??
      "—",
    responsavel_nome: c.responsavel_id
      ? perfis.get(c.responsavel_id)?.nome ?? "—"
      : null,
    prazo_sla: c.prazo_sla,
    created_at: c.created_at,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Chamados"
        descricao="Solicitações de trabalho com controle, prazo e acompanhamento."
        acoes={
          <Button asChild>
            <Link href="/chamados/novo">
              <Plus className="size-4" /> Abrir chamado
            </Link>
          </Button>
        }
      />
      <ChamadosLista
        chamados={view}
        situacaoInicial={situacao ?? ""}
        podeMover={ehLideranca(usuario.role)}
      />
    </div>
  );
}
