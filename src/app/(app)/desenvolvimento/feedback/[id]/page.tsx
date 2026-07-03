import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Target, Sparkles } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { obterFeedback, obterPerfil } from "@/features/desenvolvimento/data";
import { criarPlanoAcao } from "@/features/desenvolvimento/actions";
import {
  ETAPAS_FEEDBACK,
  FRASE_GUIA,
} from "@/features/desenvolvimento/roteiro-config";
import { PageHeader } from "@/components/shared/page-header";
import { PrintButton } from "@/components/shared/print-button";
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
import { FeedbackStatusBadge } from "@/components/shared/status-badge";
import { formatarData } from "@/lib/utils";
import type { RoteiroFeedback } from "@/types/database";

export const dynamic = "force-dynamic";

function Campo({ label, valor }: { label: string; valor: string }) {
  if (!valor?.trim()) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="whitespace-pre-wrap text-sm text-foreground/90">{valor}</p>
    </div>
  );
}

export default async function FeedbackDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuario = await exigirUsuario();
  const feedback = await obterFeedback(id);
  if (!feedback) notFound();

  const colaborador = await obterPerfil(feedback.colaborador_id);
  const roteiro = feedback.roteiro as RoteiroFeedback;
  const lideranca = ehLideranca(usuario.role);
  const souAutor = feedback.autor_id === usuario.id;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        titulo={`Feedback · ${colaborador?.nome ?? ""}`}
        descricao={`${formatarData(feedback.data)}`}
        acoes={
          <div className="flex gap-2 no-print">
            <PrintButton label="Imprimir roteiro" />
            <Button asChild variant="outline">
              <Link href="/desenvolvimento">
                <ArrowLeft className="size-4" /> Voltar
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-2">
        <FeedbackStatusBadge status={feedback.status} />
      </div>

      {/* Banner filosofia */}
      <div className="flex items-center gap-3 rounded-xl border border-warm/30 bg-warm/10 p-4">
        <Sparkles className="size-5 shrink-0 text-warm" />
        <p className="text-sm font-medium">{FRASE_GUIA}</p>
      </div>

      {/* Resumo */}
      {feedback.resumo ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo da conversa</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-foreground/90">
              {feedback.resumo}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Roteiro consolidado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roteiro da conversa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {ETAPAS_FEEDBACK.map((etapa) => {
            const camposComValor = etapa.campos.filter((c) => {
              if (c.tipo === "checkbox") return false;
              return String(roteiro[c.chave] ?? "").trim();
            });
            const temTranquila = etapa.campos.some(
              (c) => c.chave === "pessoa_tranquila"
            );
            if (camposComValor.length === 0 && !temTranquila) return null;
            return (
              <div key={etapa.id} className="space-y-3">
                <h3 className="border-b pb-1 text-sm font-semibold">
                  {etapa.titulo}
                </h3>
                {temTranquila ? (
                  <p className="text-sm text-muted-foreground">
                    Pessoa tranquila durante a conversa:{" "}
                    <span className="font-medium text-foreground">
                      {roteiro.pessoa_tranquila ? "Sim" : "Não / a acompanhar"}
                    </span>
                  </p>
                ) : null}
                {camposComValor.map((c) => (
                  <Campo
                    key={String(c.chave)}
                    label={c.label}
                    valor={String(roteiro[c.chave] ?? "")}
                  />
                ))}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Gerar plano de ação */}
      {lideranca && souAutor ? (
        <Card className="no-print">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4 text-warm" /> Gerar plano de ação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={criarPlanoAcao} className="space-y-3">
              <input
                type="hidden"
                name="colaborador_id"
                value={feedback.colaborador_id}
              />
              <input type="hidden" name="origem_tipo" value="feedback" />
              <input type="hidden" name="origem_id" value={feedback.id} />
              <div className="space-y-1.5">
                <Label htmlFor="descricao">Ação combinada *</Label>
                <Textarea
                  id="descricao"
                  name="descricao"
                  required
                  rows={2}
                  defaultValue={roteiro.plano_proposto || ""}
                  placeholder="O que a pessoa se compromete a fazer."
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="resultado_esperado">Resultado esperado</Label>
                  <Input
                    id="resultado_esperado"
                    name="resultado_esperado"
                    defaultValue={roteiro.resultado_esperado || ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prazo">Prazo</Label>
                  <Input
                    id="prazo"
                    name="prazo"
                    type="date"
                    defaultValue={roteiro.data_acao || ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="proxima_conversa">Próxima conversa</Label>
                  <Input
                    id="proxima_conversa"
                    name="proxima_conversa"
                    type="date"
                    defaultValue={roteiro.proxima_conversa || ""}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="warm" size="sm">
                  Criar plano de ação
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
