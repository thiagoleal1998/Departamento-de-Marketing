import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { ehLideranca } from "@/lib/permissions";
import { criarClienteServidor } from "@/lib/supabase/server";
import { listarPessoasOpcoes } from "@/features/operacional/cadastros-data";
import { EditorReuniao } from "@/features/atas/editor-reuniao";
import type { ItemAta, Reuniao } from "@/features/atas/data";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ReuniaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
  const editavel = ehLideranca(usuario.role) && r.estado === "em_andamento";

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={`Reunião de ${dia}/${mes}/${ano}`}
        descricao={
          editavel
            ? "Reunião em andamento: atualize os itens e conclua ao final para gerar as tarefas e avisar os responsáveis."
            : "Reunião concluída (somente leitura)."
        }
        acoes={
          <div className="flex items-center gap-2">
            <Badge variant={r.estado === "em_andamento" ? "warning" : "muted"}>
              {r.estado === "em_andamento" ? "Em andamento" : "Concluída"}
            </Badge>
            <Button asChild variant="outline">
              <Link href="/atas?aba=reunioes">
                <ArrowLeft className="size-4" /> Voltar
              </Link>
            </Button>
          </div>
        }
      />
      <EditorReuniao
        reuniaoId={id}
        editavel={editavel}
        itens={(itens as ItemAta[] | null) ?? []}
        pessoas={pessoas}
        presencas={r.presencas}
      />
    </div>
  );
}
