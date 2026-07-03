import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { listarColaboradores } from "@/features/desenvolvimento/data";
import { FeedbackBuilder } from "@/features/desenvolvimento/feedback-builder";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function NovoFeedbackPage() {
  const usuario = await exigirUsuario();
  if (!ehLideranca(usuario.role)) redirect("/desenvolvimento");

  const pessoas = await listarColaboradores();
  const colaboradores = pessoas
    .filter((p) => p.id !== usuario.id)
    .map((p) => ({ id: p.id, nome: p.nome }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        titulo="Novo feedback"
        descricao="Conduza uma conversa de desenvolvimento, passo a passo."
        acoes={
          <Button asChild variant="outline">
            <Link href="/desenvolvimento">
              <ArrowLeft className="size-4" /> Voltar
            </Link>
          </Button>
        }
      />
      <FeedbackBuilder colaboradores={colaboradores} />
    </div>
  );
}
