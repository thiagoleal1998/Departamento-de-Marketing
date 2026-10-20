"use server";

import { revalidatePath } from "next/cache";
import { avisarNovaMensagem } from "@/features/chat/aviso";
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
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const cor = String(formData.get("cor") ?? "").trim() || null;
  const danificados = Math.max(0, parseInt(String(formData.get("danificados") ?? "0"), 10) || 0);
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;
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
    descricao,
    cor,
    danificados,
    observacoes,
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

/** Altera o estoque mínimo de um item (só gerente; o aviso de baixo estoque usa esse valor). */
export async function atualizarMinimoEstoque(id: string, minimo: number): Promise<EstadoEstoque> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  const { data: perfil } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (perfil?.role !== "gerente") return { erro: "Apenas gerentes alteram o estoque mínimo." };
  if (!Number.isInteger(minimo) || minimo < 0) return { erro: "Informe um número inteiro, zero ou maior." };

  const { data: atual } = await supabase.from("estoque_itens").select("estoque_minimo").eq("id", id).maybeSingle();
  const { data, error } = await supabase.from("estoque_itens").update({ estoque_minimo: minimo }).eq("id", id).select("id");
  if (error || !data || data.length === 0) return { erro: "Não foi possível salvar o mínimo." };
  // Registro da troca (complementar: não bloqueia se a tabela ainda não existir).
  if (atual && atual.estoque_minimo !== minimo) {
    await supabase.from("estoque_alteracoes").insert({
      item_id: id,
      campo: "estoque_minimo",
      valor_anterior: String(atual.estoque_minimo),
      valor_novo: String(minimo),
      usuario_id: user.id,
    });
  }
  revalidatePath("/estoque");
  revalidatePath("/chat");
  return { ok: true };
}

/**
 * Renomeia um item do estoque (qualquer pessoa logada do time). A troca e o registro (quem, quando,
 * nome anterior e novo) acontecem juntos no banco: não existe troca sem registro.
 */
export async function renomearItemEstoque(
  id: string,
  novoNome: string,
  /** Se vier de uma conversa do chat, a troca também é avisada nela. */
  conversaId?: string
): Promise<EstadoEstoque> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const nome = novoNome.trim().replace(/\s+/g, " ").slice(0, 120);
  if (!nome) return { erro: "Informe o novo nome." };

  const { data: antes } = await supabase.from("estoque_itens").select("nome").eq("id", id).maybeSingle();
  const { error } = await supabase.rpc("renomear_item_estoque", { p_item: id, p_nome: nome });
  if (error) {
    if (error.code === "42883" || error.code === "PGRST202") {
      return { erro: "A renomeação pela equipe ainda não foi ativada no banco (migration 0053)." };
    }
    if (error.code === "42P01" || error.code === "PGRST205") {
      return { erro: "O registro de alterações ainda não foi ativado no banco (migration 0052)." };
    }
    return { erro: error.message || "Não foi possível renomear o item." };
  }

  // Avisa na conversa de onde a troca partiu (complementar: não desfaz a troca se falhar).
  if (conversaId && antes?.nome) {
    try {
      const { data: eu } = await supabase.from("profiles").select("nome").eq("id", user.id).single();
      const quem = (eu as { nome: string } | null)?.nome ?? "Alguém";
      const texto = `✏️ ${quem} trocou o nome do produto “${antes.nome}” para “${nome}”.`;
      const { error: errMsg } = await supabase
        .from("chat_mensagens")
        .insert({ conversa_id: conversaId, autor_id: user.id, texto, estoque_item_id: id });
      if (!errMsg) await avisarNovaMensagem(supabase, user.id, conversaId, texto);
    } catch {
      // aviso é opcional
    }
  }

  revalidatePath("/estoque");
  revalidatePath("/chat");
  revalidatePath("/operacional");
  return { ok: true };
}
