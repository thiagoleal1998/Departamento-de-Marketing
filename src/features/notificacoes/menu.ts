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
    .select("link")
    .eq("destinatario_id", user.id)
    .eq("lida", false)
    .not("link", "is", null)
    .limit(500);

  for (const n of (notifs as { link: string | null }[] | null) ?? []) {
    if (!n.link) continue;
    const caminho = n.link.split("?")[0].split("#")[0];
    contagens[caminho] = (contagens[caminho] ?? 0) + 1;
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
