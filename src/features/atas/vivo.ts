import "server-only";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import type { StatusItem } from "./data";

export interface EstadoVivo {
  status: StatusItem;
  prazo: string | null;
  responsavel_id: string | null;
  prioridade: number | null;
}

export const tarefaParaItem = (s: string): StatusItem =>
  s === "concluida" ? "concluido" : s === "a_fazer" ? "nao_iniciado" : "em_andamento";

export const itemParaTarefa = (s: StatusItem | null) =>
  s === "concluido" || s === "cancelado"
    ? "concluida"
    : s === "em_andamento"
      ? "em_andamento"
      : "a_fazer";

/**
 * Estado atual de cada assunto da ata, vindo da tarefa vinculada (o
 * responsável atualiza no kanban). Service role: o colaborador não enxerga as
 * tarefas dos outros pela RLS, mas precisa ver o andamento real.
 */
export async function estadoVivoPorSerie(): Promise<Map<string, EstadoVivo>> {
  const mapa = new Map<string, EstadoVivo>();
  if (!servicoDisponivel()) return mapa;
  const { data } = await criarClienteAdmin()
    .from("tarefas")
    .select("ata_serie, status, prazo, responsavel_id, prioridade")
    .not("ata_serie", "is", null);
  for (const t of (data as
    | {
        ata_serie: string;
        status: string;
        prazo: string | null;
        responsavel_id: string | null;
        prioridade: number | null;
      }[]
    | null) ?? []) {
    mapa.set(t.ata_serie, {
      status: tarefaParaItem(t.status),
      prazo: t.prazo,
      responsavel_id: t.responsavel_id,
      prioridade: t.prioridade,
    });
  }
  return mapa;
}
