"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { SugestaoStatus, SugestaoTipo } from "@/types/database";

const TIPOS: SugestaoTipo[] = ["ideia", "problema", "elogio"];
const STATUS: SugestaoStatus[] = [
  "nova",
  "em_analise",
  "planejada",
  "concluida",
  "descartada",
];

export type EstadoSugestao = { ok?: boolean; erro?: string };

/** Qualquer usuário autenticado envia uma sugestão/relato. */
export async function enviarSugestao(
  _prev: EstadoSugestao,
  formData: FormData
): Promise<EstadoSugestao> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const tipoRaw = String(formData.get("tipo") ?? "ideia") as SugestaoTipo;
  const tipo = TIPOS.includes(tipoRaw) ? tipoRaw : "ideia";
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();

  if (!titulo) return { erro: "Dê um título para o seu relato." };
  if (!descricao) return { erro: "Conte um pouco mais nos detalhes." };
  if (titulo.length > 140) return { erro: "O título está muito longo." };

  const { error } = await supabase
    .from("sugestoes")
    .insert({ tipo, titulo, descricao, autor_id: user.id });
  if (error) {
    console.error("[sugestoes] erro ao enviar:", error.code, error.message);
    // 42P01 / PGRST205: tabela inexistente (migration 0013 não aplicada).
    if (error.code === "42P01" || error.code === "PGRST205") {
      return {
        erro: "A área de feedback ainda não foi ativada no banco (migration 0013). Avise um gerente.",
      };
    }
    // 42501: bloqueado pela RLS (permissão).
    if (error.code === "42501") {
      return {
        erro: "Seu usuário não tem permissão para enviar. Avise um gerente.",
      };
    }
    return {
      erro: `Não foi possível enviar. Tente novamente. (código ${error.code ?? "?"})`,
    };
  }

  revalidatePath("/sugestoes");
  return { ok: true };
}

/** Gerente atualiza o status e/ou responde. */
export async function atualizarSugestao(
  id: string,
  status: SugestaoStatus,
  resposta: string
): Promise<EstadoSugestao> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  if (!STATUS.includes(status)) return { erro: "Status inválido." };

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (perfil?.role !== "gerente") {
    return { erro: "Apenas gerentes podem responder." };
  }

  const texto = resposta.trim();
  const { error } = await supabase
    .from("sugestoes")
    .update({
      status,
      resposta: texto || null,
      respondido_por: texto ? user.id : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { erro: "Não foi possível salvar." };

  revalidatePath("/sugestoes");
  return { ok: true };
}

/** Gerente exclui uma sugestão. */
export async function excluirSugestao(id: string): Promise<EstadoSugestao> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("sugestoes").delete().eq("id", id);
  if (error) return { erro: "Não foi possível excluir." };
  revalidatePath("/sugestoes");
  return { ok: true };
}
