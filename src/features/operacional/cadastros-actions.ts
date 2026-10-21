"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { CADASTROS, type CadastroChave } from "./cadastros";
import { compararLp } from "./historico-lps";

export type EstadoCadastro = { ok?: boolean; erro?: string };

/** Cria (id = null) ou atualiza um registro dos cadastros do Operacional. */
export async function salvarRegistro(
  chave: CadastroChave,
  id: string | null,
  valores: Record<string, string>
): Promise<EstadoCadastro> {
  const def = CADASTROS[chave];
  if (!def) return { erro: "Cadastro inválido." };

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const payload: Record<string, string | null> = {};
  for (const campo of def.campos) {
    const bruto = String(valores[campo.name] ?? "").trim();
    if (campo.obrigatorio && !bruto) {
      return { erro: `Preencha o campo "${campo.label}".` };
    }
    if (campo.tipo === "select" && bruto) {
      const ok = campo.opcoes?.some((o) => o.value === bruto);
      if (!ok) return { erro: `Valor inválido em "${campo.label}".` };
    }
    payload[campo.name] = bruto || null;
  }

  if (def.rastreio) {
    payload.alterado_por = user.id;
    payload.updated_at = new Date().toISOString();
  } else if (!id) {
    payload.criado_por = user.id;
  }

  // Landing pages: guarda o registro anterior para montar o histórico de modificações.
  const comHistorico = chave === "landing_pages";
  let antes: Record<string, string | null> | null = null;
  if (comHistorico && id) {
    const { data } = await supabase.from(def.tabela).select("*").eq("id", id).maybeSingle();
    antes = (data as Record<string, string | null> | null) ?? null;
  }

  let novoId: string | null = id;
  if (id) {
    const { error } = await supabase.from(def.tabela).update(payload).eq("id", id);
    if (error) return { erro: "Não foi possível salvar. Tente novamente." };
  } else {
    const { data, error } = await supabase.from(def.tabela).insert(payload).select("id").single();
    if (error) return { erro: "Não foi possível salvar. Tente novamente." };
    novoId = (data as { id: string } | null)?.id ?? null;
  }

  if (comHistorico) {
    try {
      const { data: ps } = await supabase.from("profiles").select("id, nome");
      const pessoas = new Map(((ps ?? []) as { id: string; nome: string }[]).map((p) => [p.id, p.nome]));
      const alteracoes = compararLp(antes, payload, pessoas);
      if (!id || alteracoes.length > 0) {
        await supabase.from("landing_pages_historico").insert({
          landing_page_id: novoId,
          lp_nome: payload.nome ?? antes?.nome ?? "—",
          acao: id ? "alterada" : "criada",
          alteracoes: id ? alteracoes : [],
          autor_id: user.id,
        });
      }
    } catch {
      // histórico é complementar: nunca impede o salvamento
    }
  }

  revalidatePath(def.rota);
  return { ok: true };
}

/** Exclui um registro (liderança — garantido também pela RLS). */
export async function excluirRegistro(
  chave: CadastroChave,
  id: string
): Promise<EstadoCadastro> {
  const def = CADASTROS[chave];
  if (!def) return { erro: "Cadastro inválido." };
  const supabase = await criarClienteServidor();
  let nomeAntes: string | null = null;
  let autor: string | null = null;
  if (chave === "landing_pages") {
    const { data } = await supabase.from(def.tabela).select("nome").eq("id", id).maybeSingle();
    nomeAntes = (data as { nome: string } | null)?.nome ?? null;
    autor = (await supabase.auth.getUser()).data.user?.id ?? null;
  }
  const { error, count } = await supabase
    .from(def.tabela)
    .delete({ count: "exact" })
    .eq("id", id);
  if (error || !count) {
    return { erro: "Não foi possível excluir (apenas liderança pode)." };
  }
  if (chave === "landing_pages" && autor) {
    try {
      await supabase.from("landing_pages_historico").insert({
        landing_page_id: null,
        lp_nome: nomeAntes ?? "—",
        acao: "excluida",
        alteracoes: [],
        autor_id: autor,
      });
    } catch {
      // histórico é complementar
    }
  }
  revalidatePath(def.rota);
  return { ok: true };
}
