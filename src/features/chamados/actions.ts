"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  CHAMADO_STATUS_META,
  CHAMADO_PRIORIDADE_META,
  type ChamadoStatus,
  type ChamadoPrioridade,
  type ChamadoTipo,
} from "@/types";
import type { Chamado } from "@/types/database";
import { inserirChamado } from "./inserir";
import { uploadReferencia } from "./upload";

async function usuarioId() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Registra uma linha no histórico do chamado. */
async function registrarHistorico(
  chamadoId: string,
  autorId: string | null,
  campo: string,
  de: string | null,
  para: string | null
) {
  const supabase = await criarClienteServidor();
  await supabase.from("chamado_historico").insert({
    chamado_id: chamadoId,
    autor_id: autorId,
    campo,
    de,
    para,
  });
}

/** Cria uma notificação interna. */
async function notificar(
  destinatarioId: string,
  tipo: string,
  titulo: string,
  link: string
) {
  const supabase = await criarClienteServidor();
  await supabase.from("notificacoes").insert({
    destinatario_id: destinatarioId,
    tipo,
    titulo,
    link,
  });
}

/** Perfil (id, nome, papel) do usuário autenticado. */
async function perfilAtual() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, nome, role")
    .eq("id", user.id)
    .single();
  return data as { id: string; nome: string; role: string } | null;
}

/** Notifica todos os gerentes (exceto quem disparou). */
async function notificarGerentes(
  tipo: string,
  titulo: string,
  link: string,
  exceto?: string
) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "gerente");
  for (const g of (data as { id: string }[] | null) ?? []) {
    if (g.id !== exceto) await notificar(g.id, tipo, titulo, link);
  }
}

export async function abrirChamado(formData: FormData) {
  const uid = await usuarioId();
  if (!uid) redirect("/login");

  const supabase = await criarClienteServidor();

  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const tipo = String(formData.get("tipo") ?? "outro") as ChamadoTipo;
  const categoria = String(formData.get("categoria") ?? "").trim() || null;
  const departamento =
    String(formData.get("departamento") ?? "").trim() || null;
  const segmento = String(formData.get("segmento") ?? "").trim() || null;
  const formato = String(formData.get("formato") ?? "").trim() || null;
  const subtipo = String(formData.get("subtipo") ?? "").trim() || null;
  const material_grafico =
    String(formData.get("material_grafico") ?? "").trim() || null;
  const prazo_entrega =
    String(formData.get("prazo_entrega") ?? "").trim() || null;
  const prioridade = String(
    formData.get("prioridade") ?? "media"
  ) as ChamadoPrioridade;
  const prazoRaw = String(formData.get("prazo_sla") ?? "").trim();
  const prazo_sla = prazoRaw ? new Date(prazoRaw).toISOString() : null;

  if (!titulo) return;

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

  // Herda a área do solicitante.
  const { data: perfil } = await supabase
    .from("profiles")
    .select("area_id")
    .eq("id", uid)
    .single();

  const { data, error } = await inserirChamado(supabase, {
    titulo,
    descricao,
    tipo,
    categoria,
    departamento,
    segmento,
    formato,
    subtipo,
    material_grafico,
    prazo_entrega,
    referencia_url,
    referencia_nome,
    prioridade,
    solicitante_id: uid,
    area_id: perfil?.area_id ?? null,
    prazo_sla,
  });

  if (error || !data) return;

  await registrarHistorico(data.id, uid, "status", null, "aberto");

  revalidatePath("/chamados");
  redirect(`/chamados/${data.id}`);
}

export async function comentarChamado(chamadoId: string, formData: FormData) {
  const uid = await usuarioId();
  if (!uid) redirect("/login");
  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto) return;

  const supabase = await criarClienteServidor();
  await supabase.from("chamado_comentarios").insert({
    chamado_id: chamadoId,
    autor_id: uid,
    texto,
  });

  // Notifica solicitante e responsável (se diferentes do autor).
  const { data: chamado } = await supabase
    .from("chamados")
    .select("numero, solicitante_id, responsavel_id")
    .eq("id", chamadoId)
    .single();
  if (chamado) {
    const alvos = new Set(
      [chamado.solicitante_id, chamado.responsavel_id].filter(
        (id): id is string => Boolean(id) && id !== uid
      )
    );
    for (const alvo of alvos) {
      await notificar(
        alvo,
        "chamado_comentario",
        `Novo comentário no chamado #${chamado.numero}`,
        `/chamados/${chamadoId}`
      );
    }
  }

  revalidatePath(`/chamados/${chamadoId}`);
}

export async function alterarStatusChamado(
  chamadoId: string,
  novoStatus: ChamadoStatus
) {
  const uid = await usuarioId();
  if (!uid) redirect("/login");

  const supabase = await criarClienteServidor();
  const { data: atual } = await supabase
    .from("chamados")
    .select("status, numero, solicitante_id")
    .eq("id", chamadoId)
    .single();
  if (!atual) return;

  const { error } = await supabase
    .from("chamados")
    .update({ status: novoStatus })
    .eq("id", chamadoId);
  if (error) return;

  await registrarHistorico(
    chamadoId,
    uid,
    "status",
    CHAMADO_STATUS_META[atual.status as ChamadoStatus]?.label ?? atual.status,
    CHAMADO_STATUS_META[novoStatus].label
  );

  if (atual.solicitante_id && atual.solicitante_id !== uid) {
    await notificar(
      atual.solicitante_id,
      "chamado_status",
      `Chamado #${atual.numero} agora está: ${CHAMADO_STATUS_META[novoStatus].label}`,
      `/chamados/${chamadoId}`
    );
  }

  revalidatePath(`/chamados/${chamadoId}`);
  revalidatePath("/chamados");
}

export async function triarChamado(chamadoId: string, formData: FormData) {
  const uid = await usuarioId();
  if (!uid) redirect("/login");

  const supabase = await criarClienteServidor();
  const { data: atual } = await supabase
    .from("chamados")
    .select("responsavel_id, prioridade, status, numero")
    .eq("id", chamadoId)
    .single();
  if (!atual) return;

  const responsavel_id =
    String(formData.get("responsavel_id") ?? "").trim() || null;
  const prioridade = String(
    formData.get("prioridade") ?? atual.prioridade
  ) as ChamadoPrioridade;
  const prazoRaw = String(formData.get("prazo_sla") ?? "").trim();
  const prazo_sla = prazoRaw ? new Date(prazoRaw).toISOString() : null;

  // Ao triar um chamado ainda "aberto", avança para em_triagem.
  const novoStatus: ChamadoStatus =
    atual.status === "aberto" ? "em_triagem" : (atual.status as ChamadoStatus);

  const { error } = await supabase
    .from("chamados")
    .update({
      responsavel_id,
      prioridade,
      prazo_sla,
      status: novoStatus,
    })
    .eq("id", chamadoId);
  if (error) return;

  if (responsavel_id && responsavel_id !== atual.responsavel_id) {
    await registrarHistorico(chamadoId, uid, "responsavel", null, "atribuído");
    if (responsavel_id !== uid) {
      await notificar(
        responsavel_id,
        "chamado_atribuido",
        `Você foi atribuído ao chamado #${atual.numero}`,
        `/chamados/${chamadoId}`
      );
    }
  }
  if (prioridade !== atual.prioridade) {
    await registrarHistorico(
      chamadoId,
      uid,
      "prioridade",
      CHAMADO_PRIORIDADE_META[atual.prioridade as ChamadoPrioridade]?.label ??
        null,
      CHAMADO_PRIORIDADE_META[prioridade].label
    );
  }

  revalidatePath(`/chamados/${chamadoId}`);
  revalidatePath("/chamados");
}

export async function converterEmTarefa(chamadoId: string) {
  const uid = await usuarioId();
  if (!uid) redirect("/login");

  const supabase = await criarClienteServidor();
  const { data: chamado } = (await supabase
    .from("chamados")
    .select("*")
    .eq("id", chamadoId)
    .single()) as { data: Chamado | null };
  if (!chamado || chamado.tarefa_id) return;

  const { data: tarefa, error } = await supabase
    .from("tarefas")
    .insert({
      titulo: chamado.titulo,
      descricao: chamado.descricao,
      responsavel_id: chamado.responsavel_id,
      chamado_id: chamado.id,
      prazo: chamado.prazo_sla,
      status: "a_fazer",
    })
    .select("id")
    .single();
  if (error || !tarefa) return;

  await supabase
    .from("chamados")
    .update({ tarefa_id: tarefa.id, status: "em_andamento" })
    .eq("id", chamadoId);

  await registrarHistorico(
    chamadoId,
    uid,
    "tarefa",
    null,
    "convertido em tarefa"
  );

  revalidatePath(`/chamados/${chamadoId}`);
  revalidatePath("/operacional");
}

/**
 * Líder aceita a demanda para começar (justificativa OBRIGATÓRIA).
 * A aprovação continua pendente até o OK de um gerente.
 */
export async function aceitarChamado(chamadoId: string, formData: FormData) {
  const perfil = await perfilAtual();
  if (!perfil) redirect("/login");
  if (perfil.role !== "gerente" && perfil.role !== "lider") return;

  const justificativa = String(formData.get("justificativa") ?? "").trim();
  if (!justificativa) return; // obrigatória para o líder

  const supabase = await criarClienteServidor();
  const { data: chamado } = await supabase
    .from("chamados")
    .select("numero, solicitante_id")
    .eq("id", chamadoId)
    .single();

  await supabase
    .from("chamados")
    .update({
      aceito_por: perfil.id,
      aceite_justificativa: justificativa,
      aceito_em: new Date().toISOString(),
      status: "em_andamento",
    })
    .eq("id", chamadoId);

  await registrarHistorico(chamadoId, perfil.id, "aceite", null, "aceito pelo líder");

  if (chamado) {
    await notificarGerentes(
      "chamado_aceite",
      `Chamado #${chamado.numero} aceito por ${perfil.nome} — aguardando sua aprovação`,
      `/chamados/${chamadoId}`,
      perfil.id
    );
    if (chamado.solicitante_id && chamado.solicitante_id !== perfil.id) {
      await notificar(
        chamado.solicitante_id,
        "chamado_aceite",
        `Seu chamado #${chamado.numero} foi aceito e está em andamento`,
        `/chamados/${chamadoId}`
      );
    }
  }

  revalidatePath(`/chamados/${chamadoId}`);
  revalidatePath("/chamados");
}

/** Gerente decide a aprovação (justificativa OPCIONAL). */
async function decidirAprovacao(
  chamadoId: string,
  formData: FormData,
  decisao: "aprovado" | "reprovado"
) {
  const perfil = await perfilAtual();
  if (!perfil) redirect("/login");
  if (perfil.role !== "gerente") return; // só gerente aprova/reprova

  const justificativa =
    String(formData.get("justificativa") ?? "").trim() || null;

  const supabase = await criarClienteServidor();
  const { data: chamado } = await supabase
    .from("chamados")
    .select("numero, solicitante_id, responsavel_id")
    .eq("id", chamadoId)
    .single();

  await supabase
    .from("chamados")
    .update({
      aprovacao: decisao,
      aprovacao_justificativa: justificativa,
      aprovado_por: perfil.id,
      aprovado_em: new Date().toISOString(),
    })
    .eq("id", chamadoId);

  const rotulo = decisao === "aprovado" ? "aprovado" : "reprovado";
  await registrarHistorico(chamadoId, perfil.id, "aprovacao", null, rotulo);

  if (chamado) {
    const alvos = new Set(
      [chamado.solicitante_id, chamado.responsavel_id].filter(
        (id): id is string => Boolean(id) && id !== perfil.id
      )
    );
    for (const alvo of alvos) {
      await notificar(
        alvo,
        "chamado_aprovacao",
        `Chamado #${chamado.numero} foi ${rotulo} por ${perfil.nome}`,
        `/chamados/${chamadoId}`
      );
    }
  }

  revalidatePath(`/chamados/${chamadoId}`);
  revalidatePath("/chamados");
}

export async function aprovarChamado(chamadoId: string, formData: FormData) {
  return decidirAprovacao(chamadoId, formData, "aprovado");
}

export async function reprovarChamado(chamadoId: string, formData: FormData) {
  return decidirAprovacao(chamadoId, formData, "reprovado");
}
