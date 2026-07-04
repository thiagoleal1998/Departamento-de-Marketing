import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { obterConfig } from "@/lib/config";
import { abrirChamado } from "@/features/chamados/actions";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CHAMADO_TIPO_LABEL } from "@/types";

export const dynamic = "force-dynamic";

export default async function NovoChamadoPage() {
  await exigirUsuario();
  const { departamentos } = await obterConfig();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        titulo="Abrir chamado"
        descricao="Descreva a solicitação. Ela entrará no fluxo de acompanhamento."
        acoes={
          <Button asChild variant="outline">
            <Link href="/chamados">
              <ArrowLeft className="size-4" /> Voltar
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <form action={abrirChamado} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                name="titulo"
                placeholder="Ex.: Criar lâmina da campanha de julho"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="departamento">Departamento solicitante *</Label>
              <Select id="departamento" name="departamento" defaultValue="" required>
                <option value="" disabled>
                  Selecione o departamento
                </option>
                {departamentos.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                name="descricao"
                placeholder="Contexto, objetivo, referências e o que se espera da entrega."
                rows={5}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Select id="tipo" name="tipo" defaultValue="outro">
                  {Object.entries(CHAMADO_TIPO_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prioridade">Prioridade</Label>
                <Select id="prioridade" name="prioridade" defaultValue="media">
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Input
                  id="categoria"
                  name="categoria"
                  placeholder="Ex.: Redes sociais, Site, E-mail"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prazo_sla">Prazo desejado</Label>
                <Input id="prazo_sla" name="prazo_sla" type="date" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button asChild variant="ghost">
                <Link href="/chamados">Cancelar</Link>
              </Button>
              <Button type="submit">Abrir chamado</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
