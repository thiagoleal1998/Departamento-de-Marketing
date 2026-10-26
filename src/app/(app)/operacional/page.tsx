import Link from "@/components/shared/link";
import { X } from "lucide-react";
import { exigirUsuario } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { obterDiretorio } from "@/features/equipe/diretorio";
import {
  KanbanTarefas,
  type TarefaView,
} from "@/features/operacional/kanban-tarefas";
import { PageHeader } from "@/components/shared/page-header";
import { unidadesDe } from "@/lib/pastas";
import { codigoTarefa } from "@/lib/codigo-tarefa";
import { normalizarLembretes } from "@/lib/lembretes";
import type { Tarefa } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function OperacionalPage({
  searchParams,
}: {
  searchParams: Promise<{ tarefa?: string; filtro?: string }>;
}) {
  const { tarefa: abrirId, filtro } = await searchParams;
  const usuario = await exigirUsuario();
  const lideranca = usuario.role === "gerente" || usuario.role === "lider";
  const supabase = await criarClienteServidor();

  const [{ data: tarefasData }, perfis] = await Promise.all([
    supabase.from("tarefas").select("*").order("ordem", { ascending: true }),
    obterDiretorio(),
  ]);
  // Mesma ordem manual de antes; dentro dela, as tarefas mais novas aparecem primeiro.
  const todas = ((tarefasData as Tarefa[] | null) ?? []).sort(
    (a, b) => a.ordem - b.ordem || b.created_at.localeCompare(a.created_at)
  );

  // Todas as tarefas vão para o quadro; a coluna "Concluído" mostra as mais recentes primeiro
  // e o quadro oferece o botão para ver todas (o histórico importado é grande).
  // Vindo do painel: "Tarefas atrasadas" mostra só as vencidas e não concluídas (mesma conta do painel).
  const hoje = new Date().toISOString().slice(0, 10);
  const soAtrasadas = filtro === "atrasadas";
  const tarefas = soAtrasadas ? todas.filter((t) => t.status !== "concluida" && !!t.prazo && t.prazo < hoje) : todas;

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
      colaborador_id: t.colaborador_id ?? null,
      colaborador_nome: t.colaborador_id ? perfis.get(t.colaborador_id)?.nome ?? null : null,
      prazo: t.prazo,
      prioridade: t.prioridade ?? null,
      tag: t.tag ?? null,
      link: t.link ?? null,
      link_site: t.link_site ?? null,
      codigo: codigoTarefa(t.numero, t.ano),
      criada_em: t.created_at,
      lembretes: normalizarLembretes(t.lembretes),
      conteudo: t.conteudo ?? null,
      pasta_raiz: t.pasta_raiz ?? null,
      pasta_caminho: t.pasta_caminho ?? null,
      podeExcluir: lideranca || t.responsavel_id === usuario.id,
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
      {soAtrasadas ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Filtrando por:</span>
          <Link
            href="/operacional"
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            title="Remover filtro"
          >
            Tarefas atrasadas ({tarefas.length}) <X className="size-3" />
          </Link>
        </div>
      ) : null}
      <KanbanTarefas
        abrirId={abrirId ?? null}
        usuarioId={usuario.id}
        lideranca={lideranca}
        unidades={unidadesDe(usuario.pasta_unidades)}
        tarefas={view}
        pessoas={Array.from(perfis.values()).map((p) => ({
          id: p.id,
          nome: p.nome,
        }))}
      />
    </div>
  );
}
