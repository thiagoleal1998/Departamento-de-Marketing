"use server";

import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";

export interface AssinaturaPush {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Salva (ou reatribui) a assinatura push deste navegador ao usuário. */
export async function salvarAssinaturaPush(
  sub: AssinaturaPush
): Promise<{ ok?: boolean; erro?: string }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada." };
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { erro: "Assinatura inválida." };
  }
  if (!servicoDisponivel()) {
    return { erro: "Serviço de notificações indisponível." };
  }

  // Service role: permite reatribuir o endpoint caso outra pessoa tenha
  // usado o mesmo navegador antes.
  const admin = criarClienteAdmin();
  const { error } = await admin.from("push_assinaturas").upsert(
    {
      usuario_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: "endpoint" }
  );
  if (error) {
    return {
      erro:
        error.code === "42P01" || error.code === "PGRST205"
          ? "Rode a migration 0021 para ativar as notificações."
          : "Não foi possível ativar as notificações.",
    };
  }
  return { ok: true };
}

/** Remove a assinatura deste navegador. */
export async function removerAssinaturaPush(
  endpoint: string
): Promise<{ ok?: boolean }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};
  await supabase
    .from("push_assinaturas")
    .delete()
    .eq("endpoint", endpoint)
    .eq("usuario_id", user.id);
  return { ok: true };
}
