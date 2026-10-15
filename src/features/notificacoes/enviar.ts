import { criarClienteServidor } from "@/lib/supabase/server";

/**
 * Cria notificações para uma lista de usuários. Falhas não interrompem
 * a ação principal (a notificação é um complemento).
 */
export async function notificar(
  destinatarios: string[],
  dados: { tipo: string; titulo: string; link: string }
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
