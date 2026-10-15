"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { tarefaParaEtapaStatus } from "@/features/projetos/tarefa";
import type { TarefaStatus } from "@/types";

/** Move uma tarefa para outra coluna do kanban (novo status). */
export async function moverTarefa(tarefaId: string, novoStatus: TarefaStatus) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("tarefas")
    .update({ status: novoStatus })
    .eq("id", tarefaId)
    .select("etapa_id")
    .single();

  // Se a tarefa é uma etapa de projeto, sincroniza a etapa.
  if (data?.etapa_id) {
    await supabase
      .from("projeto_etapas")
      .update({ status: tarefaParaEtapaStatus(novoStatus) })
      .eq("id", data.etapa_id);
    revalidatePath("/projetos");
  }
  revalidatePath("/operacional");
}

const STATUS_VALIDOS: TarefaStatus[] = [
  "a_fazer",
  "em_andamento",
  "alteracoes",
  "aprovacao_gustavo",
  "aprovacao_thiago",
  "aprovacao_marco",
  "revisao",
  "concluida",
];

export interface DadosTarefa {
  titulo: string;
  descricao: string;
  status: TarefaStatus;
  responsavel_id: string | null;
  prazo: string | null;
  prioridade: number | null;
  tag: string;
  link: string;
  conteudo: string;
}

/** Salva as propriedades e o conteúdo de um card (como a página do Notion). */
export async function salvarTarefa(
  tarefaId: string,
  d: DadosTarefa
): Promise<{ ok?: boolean; erro?: string }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const titulo = d.titulo.trim();
  if (!titulo) return { erro: "O card precisa de um título." };
  if (!STATUS_VALIDOS.includes(d.status)) return { erro: "Status inválido." };
  if (d.prioridade !== null && (d.prioridade < 1 || d.prioridade > 5)) {
    return { erro: "Prioridade deve ser de 1 a 5." };
  }
  if (d.conteudo.length > 50000) {
    return { erro: "O conteúdo está muito grande." };
  }

  const { data, error } = await supabase
    .from("tarefas")
    .update({
      titulo,
      descricao: d.descricao.trim() || null,
      status: d.status,
      responsavel_id: d.responsavel_id || null,
      prazo: d.prazo || null,
      prioridade: d.prioridade,
      tag: d.tag.trim() || null,
      link: d.link.trim() || null,
      conteudo: d.conteudo || null,
    })
    .eq("id", tarefaId)
    .select("etapa_id")
    .maybeSingle();

  if (error) return { erro: "Não foi possível salvar. Tente novamente." };
  if (!data) {
    return { erro: "Você não tem permissão para editar este card." };
  }

  if (data.etapa_id) {
    await supabase
      .from("projeto_etapas")
      .update({ status: tarefaParaEtapaStatus(d.status) })
      .eq("id", data.etapa_id);
    revalidatePath("/projetos");
  }
  revalidatePath("/operacional");
  return { ok: true };
}
