"use server";

import { criarClienteServidor } from "@/lib/supabase/server";

const POR_PAGINA = 100;

/** Últimas mensagens de uma conversa (só o que a pessoa pode ler, pela regra de acesso do banco). Usado na troca rápida de conversa. */
export async function mensagensDaConversa(conversaId: string): Promise<Record<string, unknown>[]> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("chat_mensagens")
    .select("*")
    .eq("conversa_id", conversaId)
    .order("created_at", { ascending: false })
    .limit(POR_PAGINA);
  return ((data as Record<string, unknown>[] | null) ?? []).reverse();
}

/** Abre (ou cria) a conversa direta com outra pessoa e devolve o id, sem sair da tela. */
export async function abrirConversaCom(outroId: string): Promise<{ conversaId?: string; erro?: string }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  const { data, error } = await supabase.rpc("chat_abrir_direta", { p_outro: outroId });
  if (error || !data) return { erro: "Não foi possível abrir a conversa." };
  return { conversaId: data as string };
}

/** Conversa direta já existente com cada pessoa: { id da pessoa → id da conversa }. */
export async function conversasDiretas(): Promise<Record<string, string>> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};
  const { data } = await supabase
    .from("chat_membros")
    .select("conversa_id, usuario_id, chat_conversas!inner(tipo)")
    .eq("chat_conversas.tipo", "direta");
  const mapa: Record<string, string> = {};
  for (const m of (data as { conversa_id: string; usuario_id: string }[] | null) ?? []) {
    if (m.usuario_id !== user.id) mapa[m.usuario_id] = m.conversa_id;
  }
  return mapa;
}
