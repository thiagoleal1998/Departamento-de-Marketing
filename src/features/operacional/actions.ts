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
