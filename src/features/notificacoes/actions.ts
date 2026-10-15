"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

/** Marca todas as notificações do usuário como lidas. */
export async function marcarTodasLidas() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notificacoes")
    .update({ lida: true })
    .eq("destinatario_id", user.id)
    .eq("lida", false);

  revalidatePath("/", "layout");
}

/** Marca como lidas as notificações cujo link pertence à página. */
export async function marcarLidasPorLink(prefixo: string, exato = false) {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  if (!prefixo.startsWith("/")) return;

  const filtro = exato
    ? `link.eq.${prefixo},link.like.${prefixo}?%`
    : `link.eq.${prefixo},link.like.${prefixo}?%,link.like.${prefixo}/%`;

  await supabase
    .from("notificacoes")
    .update({ lida: true })
    .eq("destinatario_id", user.id)
    .eq("lida", false)
    .or(filtro);

  revalidatePath("/", "layout");
}

/** Marca uma notificação como lida. */
export async function marcarLida(id: string) {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notificacoes")
    .update({ lida: true })
    .eq("id", id)
    .eq("destinatario_id", user.id);
  revalidatePath("/", "layout");
}
