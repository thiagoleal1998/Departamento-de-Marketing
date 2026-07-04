"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { TEXTOS_PADRAO, type TextosConfig } from "@/lib/config";
import type { Papel } from "@/types";

const PAPEIS: Papel[] = ["gerente", "lider", "colaborador"];

/** Atualiza papel, cargo, área e status de um usuário (somente Gerente via RLS). */
export async function atualizarPerfilUsuario(formData: FormData) {
  const supabase = await criarClienteServidor();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const roleRaw = String(formData.get("role") ?? "colaborador") as Papel;
  const role = PAPEIS.includes(roleRaw) ? roleRaw : "colaborador";
  const cargo = String(formData.get("cargo") ?? "").trim() || null;
  const area_id = String(formData.get("area_id") ?? "").trim() || null;
  const ativo = formData.get("ativo") === "on";

  await supabase
    .from("profiles")
    .update({ role, cargo, area_id, ativo })
    .eq("id", id);

  revalidatePath("/configuracoes");
}

export type EstadoExclusao = { erro?: string };

/**
 * Exclui um usuário permanentemente (auth + perfil, em cascata).
 * Só o gerente pode; ninguém pode excluir a si mesmo.
 */
export async function excluirUsuario(id: string): Promise<EstadoExclusao> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (perfil?.role !== "gerente") {
    return { erro: "Apenas gerentes podem excluir usuários." };
  }
  if (id === user.id) {
    return { erro: "Você não pode excluir a si mesmo." };
  }
  if (!servicoDisponivel()) {
    return { erro: "Falta configurar a chave de serviço (service role)." };
  }

  const admin = criarClienteAdmin();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    return { erro: "Não foi possível excluir o usuário. Tente novamente." };
  }

  revalidatePath("/configuracoes");
  return {};
}

export type EstadoAparencia = { ok?: boolean; erro?: string };

/** Atualiza a marca: cor primária e textos (login, portal, painel). */
export async function salvarAparencia(
  _prev: EstadoAparencia,
  formData: FormData
): Promise<EstadoAparencia> {
  const supabase = await criarClienteServidor();

  const corRaw = String(formData.get("cor_primaria") ?? "").trim();
  const cor_primaria = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(corRaw)
    ? corRaw
    : "#4f46e5";

  const textos = {} as TextosConfig;
  (Object.keys(TEXTOS_PADRAO) as (keyof TextosConfig)[]).forEach((chave) => {
    // Preserva as quebras de linha digitadas (não usar trim que remove só bordas).
    const valor = String(formData.get(chave) ?? "");
    textos[chave] = valor.trim() ? valor : TEXTOS_PADRAO[chave];
  });

  const { error } = await supabase
    .from("config_sistema")
    .upsert({ id: true, cor_primaria, textos, updated_at: new Date().toISOString() });

  if (error) {
    return { erro: "Não foi possível salvar as alterações. Tente novamente." };
  }

  // Revalida todo o app (a marca é aplicada no layout raiz).
  revalidatePath("/", "layout");
  return { ok: true };
}
