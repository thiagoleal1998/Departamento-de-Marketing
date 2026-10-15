"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { idsPorPapel, notificar } from "@/features/notificacoes/enviar";
import {
  TIPO_LABEL,
  TIPOS_COM_HORA,
  type TipoSolicitacao,
} from "./tipos";

export type EstadoSolicitacao = { ok?: boolean; erro?: string };

function formatarDataCurta(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/** Qualquer usuário cria uma solicitação para si. */
export async function criarSolicitacao(
  _prev: EstadoSolicitacao,
  formData: FormData
): Promise<EstadoSolicitacao> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const tipo = String(formData.get("tipo") ?? "") as TipoSolicitacao;
  const data_inicio = String(formData.get("data_inicio") ?? "").trim();
  const data_fim = String(formData.get("data_fim") ?? "").trim() || null;
  const hora = String(formData.get("hora") ?? "").trim() || null;
  const motivo = String(formData.get("motivo") ?? "").trim() || null;

  if (!(tipo in TIPO_LABEL)) return { erro: "Escolha o tipo de solicitação." };
  if (!data_inicio) return { erro: "Informe a data." };
  if (data_fim && data_fim < data_inicio) {
    return { erro: "A data final não pode ser anterior à inicial." };
  }
  if (TIPOS_COM_HORA.includes(tipo) && tipo !== "consulta" && !hora) {
    return { erro: "Informe o horário." };
  }

  const { error } = await supabase.from("solicitacoes").insert({
    solicitante_id: user.id,
    tipo,
    data_inicio,
    data_fim,
    hora: hora ? hora.slice(0, 5) : null,
    motivo,
  });
  if (error) {
    return {
      erro:
        error.code === "42P01" || error.code === "PGRST205"
          ? "Solicitações ainda não foram ativadas no banco (migration 0030)."
          : "Não foi possível enviar. Tente novamente.",
    };
  }

  // Avisa o gerente (quem decide).
  const { data: eu } = await supabase
    .from("profiles")
    .select("nome")
    .eq("id", user.id)
    .single();
  const nome = (eu as { nome: string } | null)?.nome ?? "Alguém";
  const gerentes = await idsPorPapel(["gerente"], user.id);
  await notificar(gerentes, {
    tipo: "solicitacao",
    titulo: `Nova solicitação de ${nome}: ${TIPO_LABEL[tipo]}`,
    corpo: data_fim
      ? `${formatarDataCurta(data_inicio)} a ${formatarDataCurta(data_fim)}`
      : formatarDataCurta(data_inicio),
    link: "/solicitacoes",
  });

  revalidatePath("/solicitacoes");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** O solicitante cancela uma solicitação ainda pendente. */
export async function cancelarSolicitacao(
  id: string
): Promise<EstadoSolicitacao> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada." };

  const { data, error } = await supabase
    .from("solicitacoes")
    .update({ status: "cancelada" })
    .eq("id", id)
    .eq("solicitante_id", user.id)
    .eq("status", "pendente")
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return { erro: "Não foi possível cancelar (já foi decidida?)." };
  }
  revalidatePath("/solicitacoes");
  return { ok: true };
}

/** O gerente aprova ou recusa. */
export async function decidirSolicitacao(
  id: string,
  decisao: "aprovada" | "recusada",
  resposta: string
): Promise<EstadoSolicitacao> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada." };

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (perfil?.role !== "gerente") {
    return { erro: "Apenas o gerente pode decidir solicitações." };
  }
  if (decisao !== "aprovada" && decisao !== "recusada") {
    return { erro: "Decisão inválida." };
  }

  const texto = resposta.trim() || null;
  const { data, error } = await supabase
    .from("solicitacoes")
    .update({
      status: decisao,
      resposta: texto,
      decidido_por: user.id,
      decidido_em: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pendente")
    .select("solicitante_id, tipo, data_inicio")
    .maybeSingle();
  if (error || !data) {
    return { erro: "Não foi possível registrar (já decidida ou cancelada?)." };
  }

  const s = data as {
    solicitante_id: string;
    tipo: TipoSolicitacao;
    data_inicio: string;
  };
  await notificar([s.solicitante_id], {
    tipo: "solicitacao_decisao",
    titulo: `Sua solicitação de ${TIPO_LABEL[s.tipo]} (${formatarDataCurta(
      s.data_inicio
    )}) foi ${decisao === "aprovada" ? "aprovada" : "recusada"}`,
    corpo: texto ?? undefined,
    link: "/solicitacoes",
  });

  revalidatePath("/solicitacoes");
  revalidatePath("/", "layout");
  return { ok: true };
}
