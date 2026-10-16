"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  discRhConfigurado,
  listarConcluidos,
  listarPesquisas,
  type DiscParticipante,
} from "@/lib/discrh";

export type EstadoSync = {
  ok?: boolean;
  erro?: string;
  novos?: number;
  atualizados?: number;
  pesquisas?: number;
};

const FATORES = ["D", "I", "S", "C"] as const;
type Fator = (typeof FATORES)[number];

/** Aceita "D", "Dominância"... ou calcula pelo maior score. */
function fator(valor: string | null | undefined): Fator | null {
  const l = valor?.trim().charAt(0).toUpperCase();
  return FATORES.includes(l as Fator) ? (l as Fator) : null;
}

function perfilDe(p: DiscParticipante): { primario: Fator; secundario: Fator | null } | null {
  const d = p.discProfile;
  if (!d) return null;
  const s = d.scores ?? {};
  const ordem = (Object.entries({ D: s.d, I: s.i, S: s.s, C: s.c }) as [Fator, number | undefined][])
    .filter(([, v]) => typeof v === "number")
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .map(([k]) => k);
  const primario = fator(d.dominant) ?? ordem[0];
  if (!primario) return null;
  const secundario = fator(d.secondary) ?? ordem.find((k) => k !== primario) ?? null;
  return { primario, secundario: secundario === primario ? null : secundario };
}

/** Traz da DISC RH os perfis concluídos e atualiza a aba Perfis (somente leitura na API). */
export async function sincronizarDiscRh(): Promise<EstadoSync> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  const { data: eu } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (eu?.role !== "gerente") {
    return { erro: "Apenas o gerente pode sincronizar os perfis." };
  }
  if (!discRhConfigurado()) {
    return { erro: "A chave da DISC RH ainda não foi configurada no servidor." };
  }

  try {
    const pesquisas = await listarPesquisas();
    // Resultado mais recente por e-mail.
    const porEmail = new Map<string, { p: DiscParticipante; pesquisa: string }>();
    for (const ps of pesquisas) {
      for (const p of await listarConcluidos(ps.id)) {
        if (!p.email || !perfilDe(p)) continue;
        const chave = p.email.trim().toLowerCase();
        const atual = porEmail.get(chave);
        if (!atual || (p.completedAt ?? "") > (atual.p.completedAt ?? "")) {
          porEmail.set(chave, { p, pesquisa: ps.name });
        }
      }
    }

    const emails = [...porEmail.keys()];
    if (emails.length === 0) return { ok: true, novos: 0, atualizados: 0, pesquisas: pesquisas.length };

    const [{ data: existentes }, { data: usuarios }] = await Promise.all([
      supabase.from("perfis_comportamentais").select("id, email, dados"),
      supabase.from("profiles").select("id, email"),
    ]);
    const linhas = new Map(
      ((existentes as { id: string; email: string; dados: Record<string, unknown> }[] | null) ?? []).map(
        (r) => [r.email.trim().toLowerCase(), r]
      )
    );
    const idUsuario = new Map(
      ((usuarios as { id: string; email: string }[] | null) ?? []).map((u) => [
        u.email.trim().toLowerCase(),
        u.id,
      ])
    );

    let novos = 0;
    let atualizados = 0;
    for (const [email, { p, pesquisa }] of porEmail) {
      const perfil = perfilDe(p)!;
      const concluido = p.completedAt ? p.completedAt.slice(0, 10) : null;
      const api = {
        scores: p.discProfile?.scores ?? null,
        participante_id: p.id,
        sincronizado_em: new Date().toISOString(),
      };
      const existente = linhas.get(email);
      if (existente) {
        const { error } = await supabase
          .from("perfis_comportamentais")
          .update({
            perfil_primario: perfil.primario,
            perfil_secundario: perfil.secundario,
            pesquisa,
            concluido_em: concluido,
            dados: { ...(existente.dados ?? {}), api },
            updated_at: new Date().toISOString(),
          })
          .eq("id", existente.id);
        if (error) return { erro: error.message };
        atualizados++;
      } else {
        const { error } = await supabase.from("perfis_comportamentais").insert({
          profile_id: idUsuario.get(email) ?? null,
          nome: p.name?.trim() || email,
          email,
          papel: "colaborador",
          pesquisa,
          concluido_em: concluido,
          perfil_primario: perfil.primario,
          perfil_secundario: perfil.secundario,
          dados: { api },
        });
        if (error) return { erro: error.message };
        novos++;
      }
    }

    revalidatePath("/gestao/perfis");
    return { ok: true, novos, atualizados, pesquisas: pesquisas.length };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Falha ao consultar a DISC RH." };
  }
}
