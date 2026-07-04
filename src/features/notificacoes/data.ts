import { criarClienteServidor } from "@/lib/supabase/server";
import type { Notificacao } from "@/types/database";

/** Últimas notificações do usuário autenticado + total não lidas. */
export async function obterNotificacoes(): Promise<{
  itens: Notificacao[];
  naoLidas: number;
}> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { itens: [], naoLidas: 0 };

  const [{ data }, { count }] = await Promise.all([
    supabase
      .from("notificacoes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("notificacoes")
      .select("*", { count: "exact", head: true })
      .eq("lida", false),
  ]);

  return {
    itens: (data as Notificacao[] | null) ?? [],
    naoLidas: count ?? 0,
  };
}
