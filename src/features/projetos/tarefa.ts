import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import type { EtapaStatus, TarefaStatus } from "@/types";

/** Etapa de projeto -> status de tarefa no kanban (mesmos valores + revisão). */
export function etapaParaTarefaStatus(status: EtapaStatus): TarefaStatus {
  return status; // a_fazer | em_andamento | concluida são válidos nos dois
}

/** Tarefa -> status de etapa (revisão cai em em_andamento). */
export function tarefaParaEtapaStatus(status: TarefaStatus): EtapaStatus {
  if (status === "concluida") return "concluida";
  if (status === "a_fazer") return "a_fazer";
  return "em_andamento"; // em_andamento e revisao
}

/** Cria o card de kanban vinculado a uma etapa de projeto (via service role). */
export async function criarTarefaDaEtapa(
  etapaId: string,
  dados: {
    titulo: string;
    descricao: string | null;
    responsavel_id: string | null;
    prazo: string | null;
  }
) {
  if (!servicoDisponivel()) return;
  const admin = criarClienteAdmin();
  await admin.from("tarefas").insert({
    titulo: dados.titulo,
    descricao: dados.descricao,
    responsavel_id: dados.responsavel_id,
    etapa_id: etapaId,
    prazo: dados.prazo,
    status: "a_fazer",
  });
}
