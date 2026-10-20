"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { avisarNovaMensagem } from "./aviso";

/** Envia uma mensagem (a entrega em tempo real vem do Supabase Realtime). */
export async function enviarMensagem(
  conversaId: string,
  texto: string
): Promise<{ ok?: boolean; erro?: string }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const limpo = texto.trim();
  if (!limpo) return { erro: "Digite uma mensagem." };
  if (limpo.length > 2000) return { erro: "Mensagem muito longa (máx. 2000)." };

  const { error } = await supabase
    .from("chat_mensagens")
    .insert({ conversa_id: conversaId, autor_id: user.id, texto: limpo });
  if (error) {
    return {
      erro:
        error.code === "42P01" || error.code === "PGRST205"
          ? "O chat ainda não foi ativado no banco (migration 0020)."
          : "Não foi possível enviar. Tente novamente.",
    };
  }
  await avisarNovaMensagem(supabase, user.id, conversaId, limpo);

  return { ok: true };
}

/** Marca a conversa como lida (zera o contador). */
export async function marcarConversaLida(conversaId: string) {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const agora = new Date().toISOString();

  // Conversa direta: a linha de membro já existe -> só atualiza.
  // (Um upsert passaria pela regra de INSERT, que só vale para a sala geral.)
  const { data: atualizadas } = await supabase
    .from("chat_membros")
    .update({ ultima_leitura: agora })
    .eq("conversa_id", conversaId)
    .eq("usuario_id", user.id)
    .select("conversa_id");

  // Sala geral: na primeira vez ainda não há linha -> cria.
  if (!atualizadas || atualizadas.length === 0) {
    await supabase.from("chat_membros").insert({
      conversa_id: conversaId,
      usuario_id: user.id,
      ultima_leitura: agora,
    });
  }

  revalidatePath("/", "layout");
}

/** Abre (ou cria) a conversa direta com outra pessoa e vai até ela. */
export async function abrirConversaDireta(formData: FormData) {
  const outro = String(formData.get("usuario_id") ?? "");
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("chat_abrir_direta", {
    p_outro: outro,
  });
  if (error || !data) redirect("/chat");
  redirect(`/chat?c=${data as string}`);
}
