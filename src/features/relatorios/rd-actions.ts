"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { removerConexaoRD } from "@/lib/rd";
import { sincronizarEmailsRD } from "./rd-sync";

type Resultado = { ok?: boolean; erro?: string; emails?: number };

async function liderancaLogada() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, ok: false as const, erro: "Sessão expirada. Entre novamente." };
  const { data: eu } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const papel = (eu as { role: string } | null)?.role;
  if (papel !== "gerente" && papel !== "lider") return { supabase, ok: false as const, erro: "Só a liderança acessa os dados do RD Station." };
  return { supabase, ok: true as const, erro: "" };
}

const ehData = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Atualiza os e-mails do período (no máximo uma vez a cada 2 minutos: o RD limita as consultas por hora). */
export async function atualizarEmailsRD(de: string, ate: string): Promise<Resultado> {
  const l = await liderancaLogada();
  if (!l.ok) return { erro: l.erro };
  if (!ehData(de) || !ehData(ate)) return { erro: "Período inválido." };

  const { data: ult } = await l.supabase.from("rd_sync").select("sincronizado_em").eq("id", 1).maybeSingle();
  const ultimo = (ult as { sincronizado_em: string | null } | null)?.sincronizado_em;
  if (ultimo && Date.now() - new Date(ultimo).getTime() < 2 * 60_000) return { erro: "Os e-mails foram atualizados há menos de 2 minutos. Aguarde um pouco." };

  try {
    const r = await sincronizarEmailsRD(de, ate);
    revalidatePath("/relatorios");
    return { ok: true, emails: r.emails };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não foi possível atualizar." };
  }
}

/** Desfaz a conexão com o RD Station (os e-mails já guardados continuam). */
export async function desconectarRD(): Promise<Resultado> {
  const l = await liderancaLogada();
  if (!l.ok) return { erro: l.erro };
  await removerConexaoRD();
  revalidatePath("/relatorios");
  return { ok: true };
}
