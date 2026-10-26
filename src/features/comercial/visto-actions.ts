"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

/** Marca as alterações do Comercial como vistas (só para quem clicou): some o aviso, os selos e as marcas. */
export async function marcarComercialVisto(): Promise<{ ok?: boolean; erro?: string }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const { error } = await supabase.from("profiles").update({ comercial_visto_em: new Date().toISOString() }).eq("id", user.id);
  if (error) return { erro: "Não foi possível marcar como visto: falta rodar a migration 0074 no Supabase." };

  // Os avisos do sino ligados ao Comercial também deixam de contar.
  await supabase
    .from("notificacoes")
    .update({ lida: true })
    .eq("destinatario_id", user.id)
    .eq("lida", false)
    .or("link.eq./comercial,link.like./comercial?%,link.like./comercial/%");

  revalidatePath("/", "layout");
  return { ok: true };
}
