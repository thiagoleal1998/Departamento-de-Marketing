import { criarClienteServidor } from "@/lib/supabase/server";
import { enviarPush } from "@/lib/push";

/**
 * Cria notificações (sino + contador do menu) e dispara o aviso push do
 * navegador. Falhas não interrompem a ação principal.
 */
export async function notificar(
  destinatarios: string[],
  dados: { tipo: string; titulo: string; link: string; corpo?: string }
): Promise<void> {
  const ids = Array.from(new Set(destinatarios.filter(Boolean)));
  if (ids.length === 0) return;
  try {
    const supabase = await criarClienteServidor();
    await supabase.from("notificacoes").insert(
      ids.map((destinatario_id) => ({
        destinatario_id,
        tipo: dados.tipo,
        titulo: dados.titulo,
        link: dados.link,
      }))
    );
  } catch {
    // ignora
  }

  await enviarPush(ids, {
    titulo: dados.titulo,
    corpo: dados.corpo,
    url: dados.link,
  });
}

/** IDs de usuários ativos por papel (exceto `excetoId`). */
export async function idsPorPapel(
  papeis: ("gerente" | "lider" | "colaborador")[],
  excetoId?: string
): Promise<string[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .in("role", papeis)
    .eq("ativo", true);
  return ((data as { id: string }[] | null) ?? [])
    .map((p) => p.id)
    .filter((id) => id !== excetoId);
}
