"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { servicoDisponivel } from "@/lib/supabase/admin";
import { sincronizarComercial } from "./sincronizar";

export type EstadoSync = { ok?: boolean; erro?: string; alteradas?: number; lpsAtualizadas?: number; aviso?: string };

/** Botão "Sincronizar agora" (gerente e líder). */
export async function sincronizarAgora(): Promise<EstadoSync> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (data?.role !== "gerente" && data?.role !== "lider") {
    return { erro: "Apenas a liderança pode sincronizar." };
  }
  if (!servicoDisponivel()) return { erro: "Serviço indisponível no servidor." };
  try {
    const r = await sincronizarComercial("manual");
    revalidatePath("/comercial");
    return { ok: true, alteradas: r.alteradas, lpsAtualizadas: r.lpsAtualizadas, aviso: r.avisoLps };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Falha ao sincronizar." };
  }
}
