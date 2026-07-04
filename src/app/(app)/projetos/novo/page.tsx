import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { criarProjeto } from "@/features/projetos/actions";
import { listarColaboradores } from "@/features/desenvolvimento/data";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { DateInputBR } from "@/components/ui/date-input-br";

export const dynamic = "force-dynamic";

export default async function NovoProjetoPage() {
  const usuario = await exigirUsuario();
  if (!ehLideranca(usuario.role)) redirect("/projetos");
  const pessoas = await listarColaboradores();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        titulo="Novo projeto"
        descricao="Crie o projeto; depois você adiciona as etapas."
        acoes={
          <Button asChild variant="outline">
            <Link href="/projetos">
              <ArrowLeft className="size-4" /> Voltar
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <form action={criarProjeto} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do projeto *</Label>
              <Input
                id="nome"
                name="nome"
                placeholder="Ex.: Feira de Turismo 2026"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                name="descricao"
                rows={4}
                placeholder="Objetivo, escopo e contexto do projeto."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="responsavel_id">Responsável</Label>
                <Select id="responsavel_id" name="responsavel_id" defaultValue="">
                  <option value="">Sem responsável</option>
                  {pessoas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_inicio">Início</Label>
                <DateInputBR id="data_inicio" name="data_inicio" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_fim">Término</Label>
                <DateInputBR id="data_fim" name="data_fim" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button asChild variant="ghost">
                <Link href="/projetos">Cancelar</Link>
              </Button>
              <Button type="submit">Criar projeto</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
