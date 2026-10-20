import type { SupabaseClient } from "@supabase/supabase-js";
import { enviarPush } from "@/lib/push";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { CONVERSA_GERAL } from "./constantes";

/** Aviso push de nova mensagem para quem está na conversa (exceto o autor). */
export async function avisarNovaMensagem(
  supabase: SupabaseClient,
  autorId: string,
  conversaId: string,
  texto: string
): Promise<void> {
  try {
    const { data: eu } = await supabase.from("profiles").select("nome").eq("id", autorId).single();
    const nome = (eu as { nome: string } | null)?.nome ?? "Alguém";

    let destinatarios: string[] = [];
    if (conversaId === CONVERSA_GERAL) {
      // Service role: o colaborador não lê os perfis dos colegas pela RLS.
      const lista = servicoDisponivel() ? criarClienteAdmin() : supabase;
      const { data } = await lista.from("profiles").select("id").eq("ativo", true).neq("id", autorId);
      destinatarios = ((data as { id: string }[] | null) ?? []).map((p) => p.id);
    } else {
      const { data } = await supabase
        .from("chat_membros")
        .select("usuario_id")
        .eq("conversa_id", conversaId)
        .neq("usuario_id", autorId);
      destinatarios = ((data as { usuario_id: string }[] | null) ?? []).map((m) => m.usuario_id);
    }

    await enviarPush(destinatarios, {
      titulo: conversaId === CONVERSA_GERAL ? `${nome} · Sala geral` : nome,
      corpo: texto.length > 120 ? `${texto.slice(0, 117)}…` : texto,
      url: conversaId === CONVERSA_GERAL ? "/chat" : `/chat?c=${conversaId}`,
      tag: `chat-${conversaId}`,
    });
  } catch {
    // aviso é opcional
  }
}
