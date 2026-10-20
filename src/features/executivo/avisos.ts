import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { enviarPush } from "@/lib/push";

/** Usuários com a visão da diretoria (ativos). Vazio se a migration 0054 ainda não foi aplicada. */
export async function usuariosDaDiretoria(): Promise<{ id: string; nome: string; email: string }[]> {
  if (!servicoDisponivel()) return [];
  const { data } = await criarClienteAdmin()
    .from("profiles")
    .select("id, nome, email")
    .eq("visao_executiva", true)
    .eq("ativo", true);
  return (data as { id: string; nome: string; email: string }[] | null) ?? [];
}

/** Avisa a diretoria (sino do painel + notificação no celular). Silencioso em caso de falha. */
export async function avisarDiretoria(dados: { titulo: string; corpo?: string; link: string; tipo?: string }): Promise<void> {
  try {
    const alvo = await usuariosDaDiretoria();
    if (alvo.length === 0) return;
    await criarClienteAdmin()
      .from("notificacoes")
      .insert(alvo.map((u) => ({ destinatario_id: u.id, tipo: dados.tipo ?? "aprovacao", titulo: dados.titulo, link: dados.link })));
    await enviarPush(
      alvo.map((u) => u.id),
      { titulo: dados.titulo, corpo: dados.corpo, url: dados.link, tag: "diretoria" }
    );
  } catch {
    // o aviso é complementar
  }
}
