"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { TarefaStatus } from "@/types";

/** Move uma tarefa para outra coluna do kanban (novo status). */
export async function moverTarefa(tarefaId: string, novoStatus: TarefaStatus) {
  const supabase = await criarClienteServidor();
  await supabase
    .from("tarefas")
    .update({ status: novoStatus })
    .eq("id", tarefaId);
  revalidatePath("/operacional");
}
