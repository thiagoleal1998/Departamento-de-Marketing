"use server";

import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { inserirChamado } from "@/features/chamados/inserir";
import { uploadReferencia } from "@/features/chamados/upload";
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
  const departamento = String(formData.get("departamento") ?? "").trim() || null;
  const segmento = String(formData.get("segmento") ?? "").trim() || null;
  const formato = String(formData.get("formato") ?? "").trim() || null;
  const subtipo = String(formData.get("subtipo") ?? "").trim() || null;
  const material_grafico =
    String(formData.get("material_grafico") ?? "").trim() || null;
  const prazo_entrega =
    String(formData.get("prazo_entrega") ?? "").trim() || null;

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
  if (!departamento) {
    return { erro: "Selecione o departamento solicitante." };
  }
  if (!segmento) {
    return { erro: "Selecione o segmento / público-alvo." };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { erro: "Informe um e-mail válido." };
  }

  const referencia = await uploadReferencia(
    formData.get("referencia") as File | null
  );
  const referenciaLinkRaw = String(formData.get("referencia_link") ?? "").trim();
  const referenciaLink = referenciaLinkRaw
    ? referenciaLinkRaw.startsWith("http")
      ? referenciaLinkRaw
      : `https://${referenciaLinkRaw}`
    : null;
  const referencia_url = referencia?.url ?? referenciaLink;
  const referencia_nome =
    referencia?.nome ?? (referenciaLink ? "Link de referência" : null);

  const supabase = criarClienteAdmin();
  const { data, error } = await inserirChamado(supabase, {
    titulo,
    descricao,
    categoria,
    departamento,
    segmento,
    formato,
    subtipo,
    material_grafico,
    prazo_entrega,
    referencia_url,
    referencia_nome,
    tipo,
    prioridade,
    status: "aberto",
    origem: "portal",
    solicitante_nome: nome,
    solicitante_email: email,
  });

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
