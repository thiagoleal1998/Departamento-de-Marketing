"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { avisarNovaMensagem } from "@/features/chat/aviso";

/**
 * Inicia (ou continua) uma conversa direta com alguém sobre um card: a mensagem vai para o chat
 * já ligada à tarefa, então o cartão do card aparece na conversa e o histórico volta para o card.
 */
export async function conversarSobreCard(
  tarefaId: string,
  destinatarioId: string,
  texto: string
): Promise<{ ok?: boolean; erro?: string; conversaId?: string }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const limpo = texto.trim();
  if (!limpo) return { erro: "Escreva a mensagem." };
  if (limpo.length > 2000) return { erro: "Mensagem muito longa (máx. 2000)." };
  if (!destinatarioId || destinatarioId === user.id) return { erro: "Escolha com quem conversar." };

  // Só conversa sobre um card quem enxerga o card (regra de acesso do banco).
  const { data: tarefa } = await supabase.from("tarefas").select("id").eq("id", tarefaId).maybeSingle();
  if (!tarefa) return { erro: "Você não tem acesso a este card." };

  const { data: conversaId, error: errConversa } = await supabase.rpc("chat_abrir_direta", { p_outro: destinatarioId });
  if (errConversa || !conversaId) {
    return {
      erro:
        errConversa?.code === "42883" || errConversa?.code === "PGRST202"
          ? "O chat ainda não foi ativado no banco (migration 0020)."
          : "Não foi possível abrir a conversa. Tente novamente.",
    };
  }

  const { error } = await supabase
    .from("chat_mensagens")
    .insert({ conversa_id: conversaId as string, autor_id: user.id, texto: limpo, tarefa_id: tarefaId });
  if (error) {
    return {
      erro:
        error.code === "42703" || error.code === "PGRST204"
          ? "O vínculo do chat com tarefas ainda não foi ativado (migration 0049)."
          : "Não foi possível enviar. Tente novamente.",
    };
  }
  await avisarNovaMensagem(supabase, user.id, conversaId as string, limpo);

  revalidatePath("/chat");
  return { ok: true, conversaId: conversaId as string };
}
