import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";

/**
 * Cria automaticamente a tarefa operacional vinculada ao chamado e liga
 * chamados.tarefa_id. Usa service role para funcionar mesmo quando quem
 * abre o chamado não é liderança (ex.: colaborador ou portal público).
 */
export async function criarTarefaDoChamado(
  chamadoId: string,
  dados: {
    titulo: string;
    descricao: string | null;
    responsavel_id: string | null;
    prazo: string | null;
  }
) {
  if (!servicoDisponivel()) return;
  const admin = criarClienteAdmin();

  const { data, error } = await admin
    .from("tarefas")
    .insert({
      titulo: dados.titulo,
      descricao: dados.descricao,
      responsavel_id: dados.responsavel_id,
      chamado_id: chamadoId,
      prazo: dados.prazo,
      status: "a_fazer",
    })
    .select("id")
    .single();

  if (error || !data) return;
  await admin.from("chamados").update({ tarefa_id: data.id }).eq("id", chamadoId);
}
