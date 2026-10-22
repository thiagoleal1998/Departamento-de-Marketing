"use server";

import { criarClienteServidor } from "@/lib/supabase/server";
import { CONVERSA_GERAL } from "./constantes";

/** Abre (ou cria) a conversa direta com a pessoa — ou a sala geral, se `outroId` for nulo — e devolve as últimas mensagens. */
export async function abrirConversaFlutuante(
  outroId: string | null
): Promise<{
  conversaId?: string;
  mensagens?: { id: string; autor_id: string; texto: string; created_at: string }[];
  erro?: string;
}> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  let conversaId: string = CONVERSA_GERAL;
  if (outroId) {
    if (outroId === user.id) return { erro: "Escolha outra pessoa." };
    const { data, error } = await supabase.rpc("chat_abrir_direta", { p_outro: outroId });
    if (error || !data) return { erro: "Não foi possível abrir a conversa. O chat já foi ativado no banco?" };
    conversaId = data as string;
  }

  const { data: msgs, error } = await supabase
    .from("chat_mensagens")
    .select("id, autor_id, texto, created_at")
    .eq("conversa_id", conversaId)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) return { erro: "Não foi possível carregar as mensagens." };

  return {
    conversaId,
    mensagens: ((msgs ?? []) as { id: string; autor_id: string; texto: string; created_at: string }[]).reverse(),
  };
}
