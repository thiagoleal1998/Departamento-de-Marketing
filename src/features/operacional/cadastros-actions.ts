"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { CADASTROS, type CadastroChave } from "./cadastros";

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

  const q = id
    ? supabase.from(def.tabela).update(payload).eq("id", id)
    : supabase.from(def.tabela).insert(payload);
  const { error } = await q;
  if (error) return { erro: "Não foi possível salvar. Tente novamente." };

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
  const { error, count } = await supabase
    .from(def.tabela)
    .delete({ count: "exact" })
    .eq("id", id);
  if (error || !count) {
    return { erro: "Não foi possível excluir (apenas liderança pode)." };
  }
  revalidatePath(def.rota);
  return { ok: true };
}
