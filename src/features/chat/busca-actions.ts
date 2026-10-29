"use server";

import { criarClienteServidor } from "@/lib/supabase/server";

export interface ResultadoBusca {
  id: string;
  autor_id: string;
  texto: string;
  created_at: string;
}

const DIA = /^\d{4}-\d{2}-\d{2}$/;
const POR_PAGINA = 100;

/** Procura mensagens da conversa por trecho do texto e/ou por dia (horário de Brasília). Só devolve o que a pessoa já pode ler (RLS). */
export async function buscarNoChat(
  conversaId: string,
  termo: string,
  dia: string
): Promise<{ resultados: ResultadoBusca[]; erro?: string }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { resultados: [], erro: "Sessão expirada. Entre novamente." };

  const t = termo.trim().slice(0, 100);
  if (!t && !DIA.test(dia)) return { resultados: [] };

  let q = supabase.from("chat_mensagens").select("id, autor_id, texto, created_at").eq("conversa_id", conversaId);
  if (t) q = q.ilike("texto", `%${t.replace(/[\\%_]/g, (c) => "\\" + c)}%`);
  if (DIA.test(dia)) {
    const ini = new Date(`${dia}T00:00:00-03:00`);
    const fim = new Date(ini.getTime() + 86_400_000);
    q = q.gte("created_at", ini.toISOString()).lt("created_at", fim.toISOString());
  }
  const { data, error } = await q.order("created_at", { ascending: false }).limit(60);
  if (error) return { resultados: [], erro: "Não foi possível buscar agora." };
  return { resultados: (data as ResultadoBusca[] | null) ?? [] };
}

/**
 * Carrega mais mensagens da conversa: `antes` = as 100 anteriores a essa data; `desde` = desta data em diante
 * (usado ao abrir um resultado da busca que está fora das mensagens já carregadas).
 */
export async function carregarMensagens(
  conversaId: string,
  opcao: { antes?: string; desde?: string }
): Promise<{ mensagens: Record<string, unknown>[]; temMais: boolean }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { mensagens: [], temMais: false };

  if (opcao.desde) {
    // Um pouco antes do resultado (contexto) até as mais recentes.
    const { data } = await supabase
      .from("chat_mensagens")
      .select("*")
      .eq("conversa_id", conversaId)
      .gte("created_at", opcao.desde)
      .order("created_at", { ascending: true })
      .limit(400);
    const { data: antes } = await supabase
      .from("chat_mensagens")
      .select("*")
      .eq("conversa_id", conversaId)
      .lt("created_at", opcao.desde)
      .order("created_at", { ascending: false })
      .limit(20);
    return { mensagens: [...(((antes as Record<string, unknown>[] | null) ?? []).reverse()), ...((data as Record<string, unknown>[] | null) ?? [])], temMais: true };
  }

  let q = supabase.from("chat_mensagens").select("*").eq("conversa_id", conversaId);
  if (opcao.antes) q = q.lt("created_at", opcao.antes);
  const { data } = await q.order("created_at", { ascending: false }).limit(POR_PAGINA);
  const lista = ((data as Record<string, unknown>[] | null) ?? []).reverse();
  return { mensagens: lista, temMais: lista.length >= POR_PAGINA };
}
