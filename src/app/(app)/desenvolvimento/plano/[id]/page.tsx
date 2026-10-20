import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { obterPerfil } from "@/features/desenvolvimento/data";
import { PlanoEditor } from "@/features/desenvolvimento/plano-editor";
import {
  BUCKET_PLANOS,
  type AnexoPlano,
  type AnexoPlanoVisivel,
  type DadosPlano,
  type ItemChecklist,
  type ObjetivoPlano,
  type Proficiencia,
} from "@/features/desenvolvimento/plano-tipos";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import type { PlanoAcao } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function PlanoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await exigirUsuario();
  const supabase = await criarClienteServidor();

  const { data } = await supabase.from("planos_acao").select("*").eq("id", id).maybeSingle();
  const plano = data as PlanoAcao | null;
  if (!plano) notFound();

  const colaborador = await obterPerfil(plano.colaborador_id);
  const lideranca = ehLideranca(usuario.role);

  const anexos = (plano.anexos as AnexoPlano[] | undefined) ?? [];
  let visiveis: AnexoPlanoVisivel[] = [];
  if (anexos.length > 0 && servicoDisponivel()) {
    const { data: urls } = await criarClienteAdmin()
      .storage.from(BUCKET_PLANOS)
      .createSignedUrls(
        anexos.map((a) => a.caminho),
        3600
      );
    const porCaminho = new Map((urls ?? []).map((u) => [u.path, u.signedUrl]));
    visiveis = anexos.flatMap((a) => {
      const url = porCaminho.get(a.caminho);
      return url ? [{ ...a, url }] : [];
    });
  }

  const inicial: DadosPlano = {
    titulo: plano.titulo ?? "",
    descricao: plano.descricao,
    resultado_esperado: plano.resultado_esperado ?? "",
    prazo: plano.prazo,
    proxima_conversa: plano.proxima_conversa,
    status: plano.status,
    objetivos: (plano.objetivos as ObjetivoPlano[] | undefined) ?? [],
    checklist: (plano.checklist as ItemChecklist[] | undefined) ?? [],
    anexos,
    proficiencia: (plano.proficiencia as Proficiencia[] | undefined) ?? [],
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={plano.titulo?.trim() || "Plano de ação"}
        descricao="Objetivos, checklist, documentos e relatório de proficiência."
        acoes={
          <Button asChild variant="outline">
            <Link href={colaborador ? `/desenvolvimento/colaborador/${colaborador.id}` : "/desenvolvimento"}>
              <ArrowLeft className="size-4" /> Voltar
            </Link>
          </Button>
        }
      />

      {colaborador ? (
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <Avatar nome={colaborador.nome} src={colaborador.avatar_url} className="size-10 text-sm" />
          <div>
            <p className="font-semibold">{colaborador.nome}</p>
            <p className="text-sm text-muted-foreground">{colaborador.cargo ?? "Colaborador"}</p>
          </div>
        </div>
      ) : null}

      <PlanoEditor planoId={plano.id} inicial={inicial} anexosVisiveis={visiveis} podeEditar={lideranca} />
    </div>
  );
}
