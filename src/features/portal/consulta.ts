"use server";

import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import type { ChamadoStatus } from "@/types";

export interface ChamadoConsulta {
  numero: number;
  /** Sem o e-mail, o título e o detalhe do andamento ficam ocultos. */
  parcial: boolean;
  titulo: string | null;
  status: ChamadoStatus;
  departamento: string | null;
  created_at: string;
  /** Responsável atual (quem está cuidando do chamado), se já houver. */
  responsavel: string | null;
  /** Andamento já em frases para o solicitante. */
  historico: { texto: string; created_at: string }[];
}

export type EstadoConsulta = { chamado?: ChamadoConsulta; erro?: string };

/**
 * Consulta pública de um chamado do portal. O e-mail é opcional: só com o número se vê a situação;
 * com o e-mail do solicitante (e se ele conferir) aparecem também o título e o andamento detalhado.
 */
export async function consultarChamado(
  _prev: EstadoConsulta,
  formData: FormData
): Promise<EstadoConsulta> {
  if (!servicoDisponivel()) {
    return { erro: "Consulta indisponível no momento." };
  }

  const numero = Number(String(formData.get("numero") ?? "").replace(/\D/g, ""));
  const email = String(formData.get("email") ?? "").trim();

  if (!numero) {
    return { erro: "Informe o número do chamado." };
  }

  const supabase = criarClienteAdmin();
  const { data: chamado } = await supabase
    .from("chamados")
    .select("id, numero, titulo, status, departamento, created_at, solicitante_email, solicitante_id, responsavel_id")
    .eq("numero", numero)
    .maybeSingle();

  // Se o e-mail foi informado, precisa conferir com o da abertura: o informado no portal ou,
  // nos chamados abertos dentro do sistema, o e-mail do perfil de quem abriu.
  let emailDoChamado = (chamado?.solicitante_email ?? "").trim().toLowerCase();
  if (chamado && !emailDoChamado && chamado.solicitante_id) {
    const { data: perfil } = await supabase.from("profiles").select("email").eq("id", chamado.solicitante_id).maybeSingle();
    emailDoChamado = ((perfil as { email: string } | null)?.email ?? "").trim().toLowerCase();
  }
  const confere = !!email && !!emailDoChamado && emailDoChamado === email.toLowerCase();
  if (!chamado || (email && !confere)) {
    return {
      erro: email
        ? "Chamado não encontrado. Confira o número e o e-mail informados."
        : "Chamado não encontrado. Confira o número informado.",
    };
  }

  if (!confere) {
    return {
      chamado: {
        numero: chamado.numero,
        parcial: true,
        titulo: null,
        status: chamado.status as ChamadoStatus,
        departamento: chamado.departamento,
        created_at: chamado.created_at,
        responsavel: null,
        historico: [],
      },
    };
  }

  let responsavel: string | null = null;
  if (chamado.responsavel_id) {
    const { data: r } = await supabase.from("profiles").select("nome").eq("id", chamado.responsavel_id).maybeSingle();
    responsavel = (r as { nome: string } | null)?.nome ?? null;
  }

  const { data: hist } = await supabase
    .from("chamado_historico")
    .select("campo, para, created_at")
    .eq("chamado_id", chamado.id)
    .order("created_at", { ascending: false });

  // Traduz o histórico interno em frases claras para quem abriu o chamado.
  let designacaoRecente = true;
  const historico = ((hist ?? []) as { campo: string; para: string | null; created_at: string }[]).map((h) => {
    const para = h.para ?? "";
    let texto: string;
    switch (h.campo) {
      case "status":
        texto = para.toLowerCase() === "aberto" ? "Chamado aberto." : `Situação atualizada para "${para}".`;
        break;
      case "responsavel":
        if (para === "responsável removido") texto = "O chamado aguarda uma nova designação.";
        else if (para.startsWith("designado a ")) texto = `Seu chamado foi designado a ${para.slice("designado a ".length)}.`;
        else if (designacaoRecente && responsavel) texto = `Seu chamado foi designado a ${responsavel}.`;
        else texto = "Seu chamado foi designado a um membro da equipe.";
        designacaoRecente = false;
        break;
      case "prioridade":
        texto = `Prioridade ajustada para ${para}.`;
        break;
      case "tarefa":
        texto = "Seu chamado foi encaminhado para a equipe de execução.";
        break;
      case "aceite":
        texto = "Seu chamado foi aceito pela liderança.";
        break;
      case "aprovacao":
        texto = para === "aprovado" ? "Seu chamado foi aprovado." : "Seu chamado não foi aprovado.";
        break;
      default:
        texto = `Atualização: ${h.campo}${para ? " → " + para : ""}.`;
    }
    return { texto, created_at: h.created_at };
  });

  return {
    chamado: {
      numero: chamado.numero,
      parcial: false,
      titulo: chamado.titulo,
      status: chamado.status as ChamadoStatus,
      departamento: chamado.departamento,
      created_at: chamado.created_at,
      responsavel,
      historico,
    },
  };
}
