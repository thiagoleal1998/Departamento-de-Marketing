"use server";

import { criarClienteServidor } from "@/lib/supabase/server";
import { CONVERSA_GERAL } from "./constantes";

/**
 * Mensagens não lidas por conversa, já no formato do chat rápido: "geral" para a sala geral e o id da outra
 * pessoa para as conversas diretas.
 */
export async function naoLidasPorConversa(): Promise<Record<string, number>> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};
  try {
    const { data } = await supabase.rpc("chat_nao_lidas");
    const linhas = ((data as { conversa_id: string; qtd: number }[] | null) ?? []).filter((l) => Number(l.qtd) > 0);
    const resultado: Record<string, number> = {};
    const diretas = linhas.filter((l) => l.conversa_id !== CONVERSA_GERAL);
    if (diretas.length > 0) {
      const { data: membros } = await supabase
        .from("chat_membros")
        .select("conversa_id, usuario_id")
        .in("conversa_id", diretas.map((l) => l.conversa_id))
        .neq("usuario_id", user.id);
      const outro = new Map(((membros as { conversa_id: string; usuario_id: string }[] | null) ?? []).map((m) => [m.conversa_id, m.usuario_id]));
      for (const l of diretas) {
        const p = outro.get(l.conversa_id);
        if (p) resultado[p] = Number(l.qtd);
      }
    }
    const geral = linhas.find((l) => l.conversa_id === CONVERSA_GERAL);
    if (geral) resultado.geral = Number(geral.qtd);
    return resultado;
  } catch {
    return {};
  }
}

type Mensagem = { id: string; autor_id: string; texto: string; created_at: string; resposta_a?: string | null; revisao?: import("./revisao-tipos").RevisaoPeca | null };

/** Abre (ou cria) a conversa direta com a pessoa — ou a sala geral, se `outroId` for nulo — e devolve as últimas mensagens. */
export async function abrirConversaFlutuante(
  outroId: string | null
): Promise<{
  conversaId?: string;
  mensagens?: Mensagem[];
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

  // Com a coluna de resposta (migration 0075); sem ela, carrega do jeito antigo.
  const consulta = (colunas: string) =>
    supabase.from("chat_mensagens").select(colunas).eq("conversa_id", conversaId).order("created_at", { ascending: false }).limit(40);
  let { data: msgs, error } = await consulta("id, autor_id, texto, created_at, resposta_a, revisao");
  if (error) ({ data: msgs, error } = await consulta("id, autor_id, texto, created_at, resposta_a"));
  if (error) ({ data: msgs, error } = await consulta("id, autor_id, texto, created_at"));
  if (error) return { erro: "Não foi possível carregar as mensagens." };

  return { conversaId, mensagens: ((msgs ?? []) as unknown as Mensagem[]).reverse() };
}
