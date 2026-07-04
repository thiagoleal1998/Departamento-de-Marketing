"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { ProjetoStatus, EtapaStatus } from "@/types";

async function usuarioId() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function criarProjeto(formData: FormData) {
  const uid = await usuarioId();
  if (!uid) redirect("/login");
  const supabase = await criarClienteServidor();

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const responsavel_id =
    String(formData.get("responsavel_id") ?? "").trim() || null;
  const data_inicio = String(formData.get("data_inicio") ?? "").trim() || null;
  const data_fim = String(formData.get("data_fim") ?? "").trim() || null;

  const { data, error } = await supabase
    .from("projetos")
    .insert({
      nome,
      descricao,
      responsavel_id,
      data_inicio,
      data_fim,
      criado_por: uid,
    })
    .select("id")
    .single();
  if (error || !data) return;

  revalidatePath("/projetos");
  redirect(`/projetos/${data.id}`);
}

export async function atualizarStatusProjeto(
  projetoId: string,
  status: ProjetoStatus
) {
  const supabase = await criarClienteServidor();
  await supabase.from("projetos").update({ status }).eq("id", projetoId);
  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/projetos");
}

export async function adicionarEtapa(projetoId: string, formData: FormData) {
  const supabase = await criarClienteServidor();
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) return;
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const responsavel_id =
    String(formData.get("responsavel_id") ?? "").trim() || null;
  const prazo = String(formData.get("prazo") ?? "").trim() || null;

  // ordem = fim da lista
  const { count } = await supabase
    .from("projeto_etapas")
    .select("*", { count: "exact", head: true })
    .eq("projeto_id", projetoId);

  await supabase.from("projeto_etapas").insert({
    projeto_id: projetoId,
    titulo,
    descricao,
    responsavel_id,
    prazo,
    ordem: count ?? 0,
  });

  revalidatePath(`/projetos/${projetoId}`);
}

export async function atualizarStatusEtapa(
  etapaId: string,
  status: EtapaStatus
) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("projeto_etapas")
    .update({ status })
    .eq("id", etapaId)
    .select("projeto_id")
    .single();
  if (data?.projeto_id) revalidatePath(`/projetos/${data.projeto_id}`);
}

export async function removerEtapa(projetoId: string, formData: FormData) {
  const supabase = await criarClienteServidor();
  const etapaId = String(formData.get("etapa_id") ?? "").trim();
  if (!etapaId) return;
  await supabase.from("projeto_etapas").delete().eq("id", etapaId);
  revalidatePath(`/projetos/${projetoId}`);
}
