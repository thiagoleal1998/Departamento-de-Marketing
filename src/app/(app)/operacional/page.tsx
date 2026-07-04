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

  const view: TarefaView[] = tarefas.map((t) => ({
    id: t.id,
    titulo: t.titulo,
    descricao: t.descricao,
    status: t.status,
    responsavel_nome: t.responsavel_id
      ? perfis.get(t.responsavel_id)?.nome ?? null
      : null,
    chamado_id: t.chamado_id,
    prazo: t.prazo,
  }));

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
