import { redirect } from "next/navigation";
import Link from "@/components/shared/link";
import { ArrowLeft } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { criarProjeto } from "@/features/projetos/actions";
import { CATEGORIAS, TEXTOS_PROJETO } from "@/features/projetos/categorias";
import { listarColaboradores } from "@/features/desenvolvimento/data";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { DateInputBR } from "@/components/ui/date-input-br";
import { CampoImagem } from "@/features/projetos/campo-imagem";

export const dynamic = "force-dynamic";

export default async function NovoProjetoPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria } = await searchParams;
  const usuario = await exigirUsuario();
  if (!ehLideranca(usuario.role)) redirect("/projetos");
  const pessoas = await listarColaboradores();
  // Famtour, evento, feira…: os textos acompanham a categoria de onde a pessoa veio.
  const textos = CATEGORIAS.find((c) => c.valor === categoria)?.textos ?? TEXTOS_PROJETO;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        titulo={textos.novo}
        descricao={`${textos.criar}; depois você adiciona as etapas.`}
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
              <Label htmlFor="nome">{textos.nome} *</Label>
              <Input
                id="nome"
                name="nome"
                placeholder={textos.exemplo}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Select
                id="categoria"
                name="categoria"
                defaultValue={
                  CATEGORIAS.some((c) => c.valor === categoria)
                    ? categoria
                    : "projetos_marketing"
                }
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.valor} value={c.valor}>
                    {c.label}
                  </option>
                ))}
              </Select>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoImagem name="capa" rotulo="Foto de capa" formato="capa" dica="Aparece no topo do projeto e na lista. Prefira uma foto horizontal." />
              <CampoImagem name="logo_parceiro" rotulo="Logo do parceiro" formato="logo" dica="Aparece sobre a capa. PNG com fundo transparente fica melhor." />
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
              <Button type="submit">{textos.botaoCriar}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
