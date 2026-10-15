"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { enviarPush } from "@/lib/push";
import { CONVERSA_GERAL } from "./constantes";

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
  // Aviso push para quem não está com o painel aberto em foco.
  try {
    const { data: eu } = await supabase
      .from("profiles")
      .select("nome")
      .eq("id", user.id)
      .single();
    const nome = (eu as { nome: string } | null)?.nome ?? "Alguém";

    let destinatarios: string[] = [];
    if (conversaId === CONVERSA_GERAL) {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("ativo", true)
        .neq("id", user.id);
      destinatarios = ((data as { id: string }[] | null) ?? []).map((p) => p.id);
    } else {
      const { data } = await supabase
        .from("chat_membros")
        .select("usuario_id")
        .eq("conversa_id", conversaId)
        .neq("usuario_id", user.id);
      destinatarios = ((data as { usuario_id: string }[] | null) ?? []).map(
        (m) => m.usuario_id
      );
    }

    await enviarPush(destinatarios, {
      titulo: conversaId === CONVERSA_GERAL ? `${nome} · Sala geral` : nome,
      corpo: limpo.length > 120 ? `${limpo.slice(0, 117)}…` : limpo,
      url: conversaId === CONVERSA_GERAL ? "/chat" : `/chat?c=${conversaId}`,
      tag: `chat-${conversaId}`,
    });
  } catch {
    // ignora
  }

  return { ok: true };
}

/** Marca a conversa como lida (zera o contador). */
export async function marcarConversaLida(conversaId: string) {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("chat_membros").upsert(
    {
      conversa_id: conversaId,
      usuario_id: user.id,
      ultima_leitura: new Date().toISOString(),
    },
    { onConflict: "conversa_id,usuario_id" }
  );
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
