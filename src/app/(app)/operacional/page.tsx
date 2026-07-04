import { exigirUsuario } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { mapaDePerfis } from "@/features/chamados/data";
import {
  KanbanTarefas,
  type TarefaView,
} from "@/features/operacional/kanban-tarefas";
import { PageHeader } from "@/components/shared/page-header";
import type { Tarefa } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function OperacionalPage() {
  await exigirUsuario();
  const supabase = await criarClienteServidor();

  const [{ data: tarefasData }, perfis] = await Promise.all([
    supabase.from("tarefas").select("*").order("ordem", { ascending: true }),
    mapaDePerfis(),
  ]);
  const tarefas = (tarefasData as Tarefa[] | null) ?? [];

  // Mapa etapa_id -> projeto_id (para o link dos cards de projeto).
  const etapaIds = tarefas
    .map((t) => t.etapa_id)
    .filter((v): v is string => Boolean(v));
  const etapaProjeto = new Map<string, string>();
  if (etapaIds.length > 0) {
    const { data: etapas } = await supabase
      .from("projeto_etapas")
      .select("id, projeto_id")
      .in("id", etapaIds);
    for (const e of (etapas as { id: string; projeto_id: string }[] | null) ??
      []) {
      etapaProjeto.set(e.id, e.projeto_id);
    }
  }

  const view: TarefaView[] = tarefas.map((t) => {
    let href: string | null = null;
    let origemLabel: string | null = null;
    if (t.chamado_id) {
      href = `/chamados/${t.chamado_id}`;
      origemLabel = "Abrir chamado";
    } else if (t.etapa_id && etapaProjeto.get(t.etapa_id)) {
      href = `/projetos/${etapaProjeto.get(t.etapa_id)}`;
      origemLabel = "Abrir projeto";
    }
    return {
      id: t.id,
      titulo: t.titulo,
      descricao: t.descricao,
      status: t.status,
      responsavel_nome: t.responsavel_id
        ? perfis.get(t.responsavel_id)?.nome ?? null
        : null,
      prazo: t.prazo,
      href,
      origemLabel,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Operacional"
        descricao="Kanban de tarefas — arraste os cards para mudar o status."
      />
      <KanbanTarefas tarefas={view} />
    </div>
  );
}
