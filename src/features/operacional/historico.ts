import "server-only";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import type { CampoHistorico } from "./historico-tipos";

export interface NovoEvento {
  campo: CampoHistorico;
  de?: string | null;
  para?: string | null;
  motivo?: string | null;
  detalhe?: string | null;
}

/** Grava eventos na linha do tempo da tarefa. Nunca interrompe o fluxo: sem a migration 0087 (ou sem o serviço), não faz nada. */
export async function registrarEventosTarefa(tarefaId: string, autorId: string | null, eventos: NovoEvento[]): Promise<void> {
  if (eventos.length === 0 || !servicoDisponivel()) return;
  try {
    await criarClienteAdmin()
      .from("tarefa_historico")
      .insert(
        eventos.map((e) => ({
          tarefa_id: tarefaId,
          autor_id: autorId,
          campo: e.campo,
          de: e.de ?? null,
          para: e.para ?? null,
          motivo: e.motivo ?? null,
          detalhe: e.detalhe ? e.detalhe.slice(0, 500) : null,
        }))
      );
  } catch {
    // o histórico é complementar
  }
}
