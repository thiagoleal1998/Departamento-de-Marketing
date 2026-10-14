"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { EstoqueCategoria } from "@/types/database";

const CATEGORIAS: EstoqueCategoria[] = ["brinde", "flyer", "banner", "outro"];
const MAX_FOTO = 700_000;

export type EstadoEstoque = { ok?: boolean; erro?: string };

/** Cadastra um item de estoque (só gerente). */
export async function criarItemEstoque(
  _prev: EstadoEstoque,
  formData: FormData
): Promise<EstadoEstoque> {
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
    return { erro: "Apenas gerentes podem cadastrar itens." };
  }

  const nome = String(formData.get("nome") ?? "").trim();
  const catRaw = String(formData.get("categoria") ?? "brinde") as EstoqueCategoria;
  const categoria = CATEGORIAS.includes(catRaw) ? catRaw : "outro";
  const local = String(formData.get("local") ?? "").trim() || null;
  const quantidade = Math.max(0, parseInt(String(formData.get("quantidade") ?? "0"), 10) || 0);
  const estoque_minimo = Math.max(0, parseInt(String(formData.get("estoque_minimo") ?? "0"), 10) || 0);
  const fotoRaw = String(formData.get("foto_url") ?? "");

  if (!nome) return { erro: "Informe o nome do item." };
  let foto_url: string | null = null;
  if (fotoRaw) {
    if (!fotoRaw.startsWith("data:image/")) return { erro: "Imagem inválida." };
    if (fotoRaw.length > MAX_FOTO) {
      return { erro: "A imagem é muito grande. Use uma foto menor." };
    }
    foto_url = fotoRaw;
  }

  const { error } = await supabase.from("estoque_itens").insert({
    nome,
    categoria,
    local,
    quantidade,
    estoque_minimo,
    foto_url,
    criado_por: user.id,
  });
  if (error) return { erro: "Não foi possível cadastrar o item." };

  revalidatePath("/estoque");
  return { ok: true };
}

/** Registra entrada ou saída (qualquer usuário autenticado). */
export async function registrarMovimento(
  itemId: string,
  tipo: "entrada" | "saida",
  quantidade: number,
  motivo: string,
  chamadoId: string,
  projetoId: string
): Promise<EstadoEstoque> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    return { erro: "Informe uma quantidade maior que zero." };
  }

  const { error } = await supabase.rpc("registrar_movimento_estoque", {
    p_item: itemId,
    p_tipo: tipo,
    p_quantidade: quantidade,
    p_motivo: motivo.trim() || null,
    p_chamado: chamadoId || null,
    p_projeto: projetoId || null,
  });
  if (error) {
    return { erro: error.message || "Não foi possível registrar." };
  }

  revalidatePath("/estoque");
  return { ok: true };
}

/** Remove um item do catálogo (só gerente) — inativa para manter o histórico. */
export async function arquivarItemEstoque(id: string): Promise<EstadoEstoque> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("estoque_itens")
    .update({ ativo: false })
    .eq("id", id);
  if (error) return { erro: "Não foi possível remover o item." };
  revalidatePath("/estoque");
  return { ok: true };
}
