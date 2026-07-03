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

export async function abrirChamado(formData: FormData) {
  const uid = await usuarioId();
  if (!uid) redirect("/login");

  const supabase = await criarClienteServidor();

  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const tipo = String(formData.get("tipo") ?? "outro") as ChamadoTipo;
  const categoria = String(formData.get("categoria") ?? "").trim() || null;
  const prioridade = String(
    formData.get("prioridade") ?? "media"
  ) as ChamadoPrioridade;
  const prazoRaw = String(formData.get("prazo_sla") ?? "").trim();
  const prazo_sla = prazoRaw ? new Date(prazoRaw).toISOString() : null;

  if (!titulo) return;

  // Herda a área do solicitante.
  const { data: perfil } = await supabase
    .from("profiles")
    .select("area_id")
    .eq("id", uid)
    .single();

  const { data, error } = await supabase
    .from("chamados")
    .insert({
      titulo,
      descricao,
      tipo,
      categoria,
      prioridade,
      solicitante_id: uid,
      area_id: perfil?.area_id ?? null,
      prazo_sla,
    })
    .select("id, numero")
    .single();

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
