"use server";

import { criarClienteServidor } from "@/lib/supabase/server";
import { EMOJIS_REACAO } from "./reacoes-constantes";

export interface ReacaoLinha {
  mensagem_id: string;
  usuario_id: string;
  emoji: string;
}

/** Reage a uma mensagem (um emoji por pessoa); `emoji` nulo tira a reação. */
export async function reagirAMensagem(mensagemId: string, emoji: string | null): Promise<{ ok?: boolean; erro?: string }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  if (emoji === null) {
    const { error } = await supabase.from("chat_reacoes").delete().eq("mensagem_id", mensagemId).eq("usuario_id", user.id);
    return error ? { erro: "Não foi possível tirar a reação." } : { ok: true };
  }
  if (!EMOJIS_REACAO.includes(emoji)) return { erro: "Reação inválida." };

  // A leitura passa pela regra de acesso: só acha a mensagem quem participa da conversa.
  const { data: msg } = await supabase.from("chat_mensagens").select("conversa_id").eq("id", mensagemId).maybeSingle();
  const conversaId = (msg as { conversa_id: string } | null)?.conversa_id;
  if (!conversaId) return { erro: "Mensagem não encontrada." };

  const { error } = await supabase
    .from("chat_reacoes")
    .upsert({ mensagem_id: mensagemId, conversa_id: conversaId, usuario_id: user.id, emoji }, { onConflict: "mensagem_id,usuario_id" });
  if (error) {
    return {
      erro: error.code === "42P01" || error.code === "PGRST205" ? "As reações ainda não foram ativadas no banco (migration 0076)." : "Não foi possível reagir.",
    };
  }
  return { ok: true };
}

/** Todas as reações das mensagens da conversa. */
export async function reacoesDaConversa(conversaId: string): Promise<ReacaoLinha[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("chat_reacoes").select("mensagem_id, usuario_id, emoji").eq("conversa_id", conversaId).limit(2000);
  if (error) return [];
  return (data as ReacaoLinha[] | null) ?? [];
}
