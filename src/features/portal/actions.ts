"use server";

import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import type { ChamadoTipo, ChamadoPrioridade } from "@/types";

export type EstadoPortal = { numero?: number; erro?: string };

const TIPOS: ChamadoTipo[] = [
  "criacao_peca",
  "revisao",
  "aprovacao",
  "suporte",
  "outro",
];
const PRIORIDADES: ChamadoPrioridade[] = ["baixa", "media", "alta", "urgente"];

/** Abre um chamado a partir do portal público (sem login). */
export async function abrirChamadoPublico(
  _prev: EstadoPortal,
  formData: FormData
): Promise<EstadoPortal> {
  if (!servicoDisponivel()) {
    return {
      erro: "Portal indisponível: falta configurar a chave de serviço do Supabase.",
    };
  }

  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const categoria = String(formData.get("categoria") ?? "").trim() || null;

  const tipoRaw = String(formData.get("tipo") ?? "outro") as ChamadoTipo;
  const tipo = TIPOS.includes(tipoRaw) ? tipoRaw : "outro";
  const prioridadeRaw = String(
    formData.get("prioridade") ?? "media"
  ) as ChamadoPrioridade;
  const prioridade = PRIORIDADES.includes(prioridadeRaw)
    ? prioridadeRaw
    : "media";

  if (!nome || !email || !titulo) {
    return { erro: "Preencha nome, e-mail e o que você precisa." };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { erro: "Informe um e-mail válido." };
  }

  const supabase = criarClienteAdmin();
  const { data, error } = await supabase
    .from("chamados")
    .insert({
      titulo,
      descricao,
      categoria,
      tipo,
      prioridade,
      status: "aberto",
      origem: "portal",
      solicitante_nome: nome,
      solicitante_email: email,
    })
    .select("id, numero")
    .single();

  if (error || !data) {
    return {
      erro: "Não foi possível registrar seu chamado agora. Tente novamente.",
    };
  }

  await supabase.from("chamado_historico").insert({
    chamado_id: data.id,
    campo: "status",
    de: null,
    para: "aberto (via portal)",
  });

  return { numero: data.numero };
}
