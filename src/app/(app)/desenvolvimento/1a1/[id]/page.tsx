import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, HeartHandshake } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { obter1a1, obterPerfil } from "@/features/desenvolvimento/data";
import { BLOCOS_1A1 } from "@/features/desenvolvimento/roteiro-config";
import { PageHeader } from "@/components/shared/page-header";
import { PrintButton } from "@/components/shared/print-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatarData } from "@/lib/utils";
import type { AnotacoesUmAUm } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function UmAUmDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await exigirUsuario();
  const conversa = await obter1a1(id);
  if (!conversa) notFound();

  const colaborador = await obterPerfil(conversa.colaborador_id);
  const anotacoes = conversa.anotacoes as AnotacoesUmAUm;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        titulo={`1:1 · ${colaborador?.nome ?? ""}`}
        descricao={`${conversa.tema ?? "Conversa 1:1"} · ${formatarData(conversa.data)}`}
        acoes={
          <div className="flex gap-2 no-print">
            <PrintButton label="Imprimir" />
            <Button asChild variant="outline">
              <Link href="/desenvolvimento">
                <ArrowLeft className="size-4" /> Voltar
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-3 rounded-xl border border-warm/30 bg-warm/10 p-4">
        <HeartHandshake className="size-5 shrink-0 text-warm" />
        <p className="text-sm text-muted-foreground">
          Conversa de construção de futuro — interesse genuíno, conexão e
          colaboração.
        </p>
      </div>

      {BLOCOS_1A1.map((bloco) => {
        const comValor = bloco.campos.filter((c) =>
          String(anotacoes[c.chave] ?? "").trim()
        );
        if (comValor.length === 0) return null;
        return (
          <Card key={bloco.id}>
            <CardHeader>
              <CardTitle className="text-base">{bloco.titulo}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comValor.map((c) => (
                <div key={String(c.chave)} className="space-y-0.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {c.label}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-foreground/90">
                    {String(anotacoes[c.chave] ?? "")}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
