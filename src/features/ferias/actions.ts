"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

type Resultado = { ok?: boolean; erro?: string };
const MIGRACAO = "As férias ainda não foram ativadas no banco (migration 0059).";
const semTabela = (c?: string) => c === "42P01" || c === "PGRST205";
const ehData = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Cria (id = null) ou atualiza um período de férias. Só a liderança (garantido também pela RLS). */
export async function salvarFerias(
  id: string | null,
  d: { profile_id: string; inicio: string; fim: string; observacao: string }
): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  if (!d.profile_id) return { erro: "Escolha o colaborador." };
  if (!ehData(d.inicio) || !ehData(d.fim)) return { erro: "Informe a data de início e a de fim." };
  if (d.fim < d.inicio) return { erro: "A data de fim não pode ser antes da de início." };

  const dados = {
    profile_id: d.profile_id,
    inicio: d.inicio,
    fim: d.fim,
    observacao: d.observacao.trim().slice(0, 500) || null,
  };
  const { data, error } = id
    ? await supabase.from("ferias").update(dados).eq("id", id).select("id")
    : await supabase.from("ferias").insert({ ...dados, criado_por: user.id }).select("id");
  if (error) return { erro: semTabela(error.code) ? MIGRACAO : "Não foi possível salvar as férias." };
  if (!data || data.length === 0) return { erro: "Só a liderança pode registrar férias." };

  revalidatePath("/gestao/ferias");
  return { ok: true };
}

export async function excluirFerias(id: string): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("ferias").delete().eq("id", id).select("id");
  if (error || !data || data.length === 0) return { erro: "Não foi possível excluir (apenas liderança pode)." };
  revalidatePath("/gestao/ferias");
  return { ok: true };
}
