import { exigirUsuario } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { obterDiretorio } from "@/features/equipe/diretorio";
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
    obterDiretorio(),
  ]);
  const todas = (tarefasData as Tarefa[] | null) ?? [];

  // Coluna "Concluída": só as 30 mais recentes (o histórico importado é grande).
  const LIMITE_CONCLUIDAS = 30;
  const concluidas = todas
    .filter((t) => t.status === "concluida")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const idsConcluidasVisiveis = new Set(
    concluidas.slice(0, LIMITE_CONCLUIDAS).map((t) => t.id)
  );
  const tarefas = todas.filter(
    (t) => t.status !== "concluida" || idsConcluidasVisiveis.has(t.id)
  );
  const concluidasOcultas = concluidas.length - idsConcluidasVisiveis.size;

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
    let origemHref: string | null = null;
    let origemLabel: string | null = null;
    if (t.chamado_id) {
      origemHref = `/chamados/${t.chamado_id}`;
      origemLabel = "Abrir chamado";
    } else if (t.etapa_id && etapaProjeto.get(t.etapa_id)) {
      origemHref = `/projetos/${etapaProjeto.get(t.etapa_id)}`;
      origemLabel = "Abrir projeto";
    }
    return {
      id: t.id,
      titulo: t.titulo,
      descricao: t.descricao,
      status: t.status,
      responsavel_id: t.responsavel_id,
      responsavel_nome: t.responsavel_id
        ? perfis.get(t.responsavel_id)?.nome ?? t.responsaveis_notion ?? null
        : t.responsaveis_notion ?? null,
      responsaveis_notion: t.responsaveis_notion ?? null,
      prazo: t.prazo,
      prioridade: t.prioridade ?? null,
      tag: t.tag ?? null,
      link: t.link ?? null,
      conteudo: t.conteudo ?? null,
      origemHref,
      origemLabel,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Operacional · Tarefas"
        descricao="Quadro de tarefas — arraste para mudar de coluna e clique no card para editar."
      />
      {concluidasOcultas > 0 ? (
        <p className="text-sm text-muted-foreground">
          Mostrando as {LIMITE_CONCLUIDAS} tarefas concluídas mais recentes;{" "}
          {concluidasOcultas} mais antigas ficam guardadas no histórico.
        </p>
      ) : null}
      <KanbanTarefas
        tarefas={view}
        pessoas={Array.from(perfis.values()).map((p) => ({
          id: p.id,
          nome: p.nome,
        }))}
      />
    </div>
  );
}
