import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Target } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { listarColaboradores } from "@/features/desenvolvimento/data";
import { criarPlanoDireto } from "@/features/desenvolvimento/plano-actions";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export const dynamic = "force-dynamic";

export default async function NovoPlanoPage({
  searchParams,
}: {
  searchParams: Promise<{ colaborador?: string; erro?: string }>;
}) {
  const { colaborador, erro } = await searchParams;
  const usuario = await exigirUsuario();
  if (!ehLideranca(usuario.role)) redirect("/desenvolvimento");

  const pessoas = (await listarColaboradores()).filter((p) => p.id !== usuario.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        titulo="Novo plano de ação"
        descricao="Crie o plano e, na próxima tela, complete com objetivos, checklist, documentos e notas."
        acoes={
          <Button asChild variant="outline">
            <Link href="/desenvolvimento">
              <ArrowLeft className="size-4" /> Voltar
            </Link>
          </Button>
        }
      />

      {erro ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {erro === "1"
            ? "Escolha o colaborador e descreva o plano."
            : "Não foi possível criar o plano. Confira se a migration 0045 foi aplicada e tente novamente."}
        </p>
      ) : null}

      <form action={criarPlanoDireto}>
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="colaborador_id">Para quem? *</Label>
              <Select id="colaborador_id" name="colaborador_id" required defaultValue={colaborador ?? ""}>
                <option value="" disabled>
                  Selecione
                </option>
                {pessoas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="titulo">Título</Label>
              <Input id="titulo" name="titulo" placeholder="Ex.: Evolução em gestão de projetos" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição do plano *</Label>
              <Textarea id="descricao" name="descricao" rows={6} required />
            </div>
            <Button type="submit" variant="warm">
              <Target className="size-4" /> Criar plano e continuar
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
