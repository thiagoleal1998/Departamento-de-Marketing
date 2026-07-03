"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ROTEIRO_VAZIO, ANOTACOES_1A1_VAZIO } from "./roteiro-config";
import type {
  RoteiroFeedback,
  AnotacoesUmAUm,
  PlanoAcao,
} from "@/types/database";
import type { PlanoAcaoStatus } from "@/types";

async function usuarioId() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function salvarFeedback(formData: FormData) {
  const uid = await usuarioId();
  if (!uid) redirect("/login");
  const supabase = await criarClienteServidor();

  const colaborador_id = String(formData.get("colaborador_id") ?? "").trim();
  if (!colaborador_id) return;

  const dataRaw = String(formData.get("data") ?? "").trim();
  const status =
    String(formData.get("status") ?? "rascunho") === "realizado"
      ? "realizado"
      : "rascunho";
  const resumo = String(formData.get("resumo") ?? "").trim() || null;

  // Reconstrói o roteiro a partir dos campos do formulário.
  const roteiro: RoteiroFeedback = { ...ROTEIRO_VAZIO };
  (Object.keys(ROTEIRO_VAZIO) as (keyof RoteiroFeedback)[]).forEach((chave) => {
    if (chave === "pessoa_tranquila") {
      roteiro.pessoa_tranquila = formData.get("pessoa_tranquila") === "on";
    } else {
      (roteiro[chave] as string) = String(formData.get(chave) ?? "");
    }
  });

  const { data, error } = await supabase
    .from("feedbacks")
    .insert({
      colaborador_id,
      autor_id: uid,
      data: dataRaw || new Date().toISOString().slice(0, 10),
      status,
      roteiro,
      resumo,
    })
    .select("id")
    .single();

  if (error || !data) return;

  revalidatePath("/desenvolvimento");
  revalidatePath(`/desenvolvimento/colaborador/${colaborador_id}`);
  redirect(`/desenvolvimento/feedback/${data.id}`);
}

export async function salvar1a1(formData: FormData) {
  const uid = await usuarioId();
  if (!uid) redirect("/login");
  const supabase = await criarClienteServidor();

  const colaborador_id = String(formData.get("colaborador_id") ?? "").trim();
  if (!colaborador_id) return;

  const dataRaw = String(formData.get("data") ?? "").trim();
  const tema = String(formData.get("tema") ?? "").trim() || null;

  const anotacoes: AnotacoesUmAUm = { ...ANOTACOES_1A1_VAZIO };
  (Object.keys(ANOTACOES_1A1_VAZIO) as (keyof AnotacoesUmAUm)[]).forEach(
    (chave) => {
      anotacoes[chave] = String(formData.get(chave) ?? "");
    }
  );

  const { data, error } = await supabase
    .from("um_a_um")
    .insert({
      colaborador_id,
      lider_id: uid,
      data: dataRaw || new Date().toISOString().slice(0, 10),
      tema,
      anotacoes,
    })
    .select("id")
    .single();

  if (error || !data) return;

  revalidatePath("/desenvolvimento");
  revalidatePath(`/desenvolvimento/colaborador/${colaborador_id}`);
  redirect(`/desenvolvimento/1a1/${data.id}`);
}

export async function criarPlanoAcao(formData: FormData) {
  const uid = await usuarioId();
  if (!uid) redirect("/login");
  const supabase = await criarClienteServidor();

  const colaborador_id = String(formData.get("colaborador_id") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  if (!colaborador_id || !descricao) return;

  const origem_tipo =
    String(formData.get("origem_tipo") ?? "feedback") === "um_a_um"
      ? "um_a_um"
      : "feedback";
  const origem_id = String(formData.get("origem_id") ?? "").trim() || null;
  const resultado_esperado =
    String(formData.get("resultado_esperado") ?? "").trim() || null;
  const prazo = String(formData.get("prazo") ?? "").trim() || null;
  const proxima_conversa =
    String(formData.get("proxima_conversa") ?? "").trim() || null;

  await supabase.from("planos_acao").insert({
    origem_tipo,
    origem_id,
    colaborador_id,
    autor_id: uid,
    descricao,
    resultado_esperado,
    prazo,
    proxima_conversa,
  });

  revalidatePath("/desenvolvimento");
  revalidatePath(`/desenvolvimento/colaborador/${colaborador_id}`);
}

export async function atualizarStatusPlano(
  planoId: string,
  status: PlanoAcaoStatus
) {
  const uid = await usuarioId();
  if (!uid) redirect("/login");
  const supabase = await criarClienteServidor();

  const { data } = (await supabase
    .from("planos_acao")
    .update({ status })
    .eq("id", planoId)
    .select("colaborador_id")
    .single()) as { data: Pick<PlanoAcao, "colaborador_id"> | null };

  revalidatePath("/desenvolvimento");
  if (data?.colaborador_id) {
    revalidatePath(`/desenvolvimento/colaborador/${data.colaborador_id}`);
  }
}
