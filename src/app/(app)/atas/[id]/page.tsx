import Link from "@/components/shared/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, Pencil } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { criarClienteServidor } from "@/lib/supabase/server";
import { listarPessoasOpcoes } from "@/features/operacional/cadastros-data";
import { EditorReuniao } from "@/features/atas/editor-reuniao";
import { VisaoAta } from "@/features/atas/visao-ata";
import type { ItemAta, Reuniao } from "@/features/atas/data";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ReuniaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ editar?: string }>;
}) {
  const { id } = await params;
  const { editar } = await searchParams;
  const usuario = await exigirUsuario();
  const supabase = await criarClienteServidor();

  const { data: reuniao } = await supabase.from("reunioes").select("*").eq("id", id).maybeSingle();
  if (!reuniao) notFound();
  const r = reuniao as Reuniao;

  const [{ data: itens }, pessoas] = await Promise.all([
    supabase
      .from("reuniao_itens")
      .select("*")
      .eq("reuniao_id", id)
      .eq("secao", "ata")
      .order("ordem", { ascending: true }),
    listarPessoasOpcoes(),
  ]);

  const [ano, mes, dia] = r.data.split("-");
  const lideranca = ehLideranca(usuario.role);
  const emEdicao = lideranca && editar === "1";
  const andamento = r.estado === "em_andamento";
  const lista = (itens as ItemAta[] | null) ?? [];
  const nomePessoa = (pid: string | null) => (pid ? pessoas.find((p) => p.id === pid)?.nome ?? null : null);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={`Reunião de ${dia}/${mes}/${ano}`}
        descricao={
          emEdicao
            ? andamento
              ? "Editando: ajuste, insira ou retire itens e conclua ao final para gerar as tarefas e avisar os responsáveis."
              : "Editando uma ata já concluída: as mudanças valem na hora (na ata mais recente, também atualizam as tarefas)."
            : "Visualização completa da ata."
        }
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={andamento ? "warning" : "muted"}>{andamento ? "Em andamento" : "Concluída"}</Badge>
            {lideranca ? (
              emEdicao ? (
                <Button asChild variant="outline">
                  <Link href={`/atas/${id}`}>
                    <Eye className="size-4" /> Ver ata
                  </Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href={`/atas/${id}?editar=1`}>
                    <Pencil className="size-4" /> Editar ata
                  </Link>
                </Button>
              )
            ) : null}
            <Button asChild variant="outline">
              <Link href="/atas?aba=reunioes">
                <ArrowLeft className="size-4" /> Voltar
              </Link>
            </Button>
          </div>
        }
      />
      {emEdicao ? (
        <EditorReuniao
          reuniaoId={id}
          editavel
          podeConcluir={andamento}
          data={r.data}
          itens={lista}
          pessoas={pessoas}
          presencas={r.presencas}
        />
      ) : (
        <VisaoAta itens={lista} presencas={r.presencas} nomePessoa={nomePessoa} />
      )}
    </div>
  );
}
