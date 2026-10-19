import { criarClienteServidor } from "@/lib/supabase/server";
import type { Contagens } from "@/lib/contagens";

/** Novidades não lidas por página (notificações + chat) para o menu. */
export async function contagensDoMenu(): Promise<Contagens> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const contagens: Contagens = {};

  const { data: notifs } = await supabase
    .from("notificacoes")
    .select("link, created_at")
    .eq("destinatario_id", user.id)
    .eq("lida", false)
    .not("link", "is", null)
    .limit(500);

  let comercialDesde: string | null = null;
  for (const n of (notifs as { link: string | null; created_at: string }[] | null) ?? []) {
    if (!n.link) continue;
    if (n.link.startsWith("/comercial") && (!comercialDesde || n.created_at < comercialDesde)) {
      comercialDesde = n.created_at;
    }
    const caminho = n.link.split("?")[0].split("#")[0];
    contagens[caminho] = (contagens[caminho] ?? 0) + 1;
  }

  // Comercial: o número é a quantidade de produtos alterados desde o primeiro aviso não lido
  // (e não a quantidade de avisos).
  if (comercialDesde) {
    const { data: alt } = await supabase
      .from("comercial_alteracoes")
      .select("chave")
      .neq("tipo", "removido")
      .gte("detectado_em", comercialDesde)
      .limit(1000);
    const produtos = new Set(((alt as { chave: string }[] | null) ?? []).map((a) => a.chave));
    if (produtos.size > 0) contagens["/comercial"] = produtos.size;
  }

  // Chat: mensagens não lidas (tabela pode não existir antes da migration).
  try {
    const { data: chat } = await supabase.rpc("chat_nao_lidas");
    const total = ((chat as { qtd: number }[] | null) ?? []).reduce(
      (s, r) => s + Number(r.qtd),
      0
    );
    if (total > 0) contagens["/chat"] = total;
  } catch {
    // ignora
  }

  return contagens;
}
