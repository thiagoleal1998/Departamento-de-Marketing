"use server";

import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import type { EventoTarefa } from "./historico-tipos";

/** Linha do tempo de uma tarefa (da mais recente para a mais antiga). Só quem enxerga a tarefa lê o histórico. */
export async function historicoDaTarefa(tarefaId: string): Promise<{ eventos: EventoTarefa[]; semTabela?: boolean }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { eventos: [] };

  const { data, error } = await supabase
    .from("tarefa_historico")
    .select("id, campo, de, para, motivo, detalhe, autor_id, created_at")
    .eq("tarefa_id", tarefaId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return { eventos: [], semTabela: true };

  const linhas = (data as { id: string; campo: string; de: string | null; para: string | null; motivo: string | null; detalhe: string | null; autor_id: string | null; created_at: string }[] | null) ?? [];
  // Nomes: o colaborador não lê o perfil dos colegas pela regra de acesso, então vêm pelo servidor.
  const nomes = new Map<string, string>();
  const ids = Array.from(new Set(linhas.map((l) => l.autor_id).filter((x): x is string => !!x)));
  if (ids.length > 0 && servicoDisponivel()) {
    const { data: ps } = await criarClienteAdmin().from("profiles").select("id, nome").in("id", ids);
    for (const p of (ps as { id: string; nome: string }[] | null) ?? []) nomes.set(p.id, p.nome);
  }
  return {
    eventos: linhas.map((l) => ({ id: l.id, campo: l.campo, de: l.de, para: l.para, motivo: l.motivo, detalhe: l.detalhe, autor: l.autor_id ? nomes.get(l.autor_id) ?? null : null, quando: l.created_at })),
  };
}
