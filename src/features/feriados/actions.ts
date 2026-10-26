"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

type Resultado = { ok?: boolean; erro?: string };
const MIGRACAO = "A escala de feriados ainda não foi ativada no banco (migration 0067).";
const semTabela = (c?: string) => c === "42P01" || c === "PGRST205";
const ehData = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

async function contexto() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Escala uma pessoa num feriado (só liderança — garantido também pela RLS). */
export async function escalarPessoa(data: string, profileId: string): Promise<Resultado> {
  const { supabase, user } = await contexto();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  if (!ehData(data) || !profileId) return { erro: "Informe o feriado e a pessoa." };
  const { data: linhas, error } = await supabase
    .from("escala_feriados")
    .upsert({ data, profile_id: profileId, criado_por: user.id }, { onConflict: "data,profile_id" })
    .select("id");
  if (error) return { erro: semTabela(error.code) ? MIGRACAO : "Não foi possível escalar." };
  if (!linhas || linhas.length === 0) return { erro: "Só a liderança monta a escala." };
  revalidatePath("/gestao/feriados");
  return { ok: true };
}

export async function removerEscala(id: string): Promise<Resultado> {
  const { supabase, user } = await contexto();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  const { data, error } = await supabase.from("escala_feriados").delete().eq("id", id).select("id");
  if (error || !data || data.length === 0) return { erro: "Não foi possível remover da escala." };
  revalidatePath("/gestao/feriados");
  return { ok: true };
}

/** Feriado ou data extra (municipal, estadual, ponte). */
export async function adicionarFeriadoExtra(data: string, nome: string): Promise<Resultado> {
  const { supabase, user } = await contexto();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  const n = nome.trim().slice(0, 120);
  if (!ehData(data)) return { erro: "Informe a data." };
  if (!n) return { erro: "Informe o nome do feriado." };
  const { data: linhas, error } = await supabase.from("feriados_extras").insert({ data, nome: n, criado_por: user.id }).select("id");
  if (error) return { erro: semTabela(error.code) ? MIGRACAO : "Não foi possível adicionar." };
  if (!linhas || linhas.length === 0) return { erro: "Só a liderança adiciona feriados." };
  revalidatePath("/gestao/feriados");
  return { ok: true };
}

export async function removerFeriadoExtra(id: string): Promise<Resultado> {
  const { supabase, user } = await contexto();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  const { data, error } = await supabase.from("feriados_extras").delete().eq("id", id).select("id");
  if (error || !data || data.length === 0) return { erro: "Não foi possível remover." };
  revalidatePath("/gestao/feriados");
  return { ok: true };
}
