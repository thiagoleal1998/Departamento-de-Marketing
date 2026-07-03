import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus, MessageCircle } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import {
  historicoColaborador,
  obterPerfil,
} from "@/features/desenvolvimento/data";
import { HistoricoView } from "@/features/desenvolvimento/historico-view";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { PAPEL_LABEL } from "@/types";

export const dynamic = "force-dynamic";

export default async function ColaboradorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuario = await exigirUsuario();
  const colaborador = await obterPerfil(id);
  if (!colaborador) notFound();

  const lideranca = ehLideranca(usuario.role);
  const { feedbacks, conversas, planos } = await historicoColaborador(id);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Histórico de desenvolvimento"
        descricao="Linha do tempo de feedbacks, conversas e planos."
        acoes={
          <Button asChild variant="outline">
            <Link href="/desenvolvimento">
              <ArrowLeft className="size-4" /> Voltar
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Avatar
            nome={colaborador.nome}
            src={colaborador.avatar_url}
            className="size-12 text-sm"
          />
          <div>
            <p className="text-lg font-semibold">{colaborador.nome}</p>
            <p className="text-sm text-muted-foreground">
              {colaborador.cargo ?? PAPEL_LABEL[colaborador.role]}
            </p>
          </div>
        </div>
        {lideranca ? (
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/desenvolvimento/nova-1a1">
                <MessageCircle className="size-4" /> Nova 1:1
              </Link>
            </Button>
            <Button asChild variant="warm" size="sm">
              <Link href="/desenvolvimento/novo-feedback">
                <Plus className="size-4" /> Novo feedback
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      <HistoricoView
        feedbacks={feedbacks}
        conversas={conversas}
        planos={planos}
        podeEditarPlano={lideranca}
      />
    </div>
  );
}
