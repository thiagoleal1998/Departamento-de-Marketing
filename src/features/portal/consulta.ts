"use server";

import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import type { ChamadoStatus } from "@/types";

export interface ChamadoConsulta {
  numero: number;
  titulo: string;
  status: ChamadoStatus;
  departamento: string | null;
  created_at: string;
  historico: { campo: string; para: string | null; created_at: string }[];
}

export type EstadoConsulta = { chamado?: ChamadoConsulta; erro?: string };

/** Consulta pública de um chamado do portal pelo número + e-mail do solicitante. */
export async function consultarChamado(
  _prev: EstadoConsulta,
  formData: FormData
): Promise<EstadoConsulta> {
  if (!servicoDisponivel()) {
    return { erro: "Consulta indisponível no momento." };
  }

  const numero = Number(String(formData.get("numero") ?? "").replace(/\D/g, ""));
  const email = String(formData.get("email") ?? "").trim();

  if (!numero || !email) {
    return { erro: "Informe o número do chamado e o e-mail usado na abertura." };
  }

  const supabase = criarClienteAdmin();
  const { data: chamado } = await supabase
    .from("chamados")
    .select("id, numero, titulo, status, departamento, created_at")
    .eq("numero", numero)
    .ilike("solicitante_email", email)
    .maybeSingle();

  if (!chamado) {
    return {
      erro: "Chamado não encontrado. Confira o número e o e-mail informados.",
    };
  }

  const { data: hist } = await supabase
    .from("chamado_historico")
    .select("campo, para, created_at")
    .eq("chamado_id", chamado.id)
    .order("created_at", { ascending: false });

  return {
    chamado: {
      numero: chamado.numero,
      titulo: chamado.titulo,
      status: chamado.status as ChamadoStatus,
      departamento: chamado.departamento,
      created_at: chamado.created_at,
      historico: (hist ?? []) as ChamadoConsulta["historico"],
    },
  };
}
