import { criarClienteServidor } from "@/lib/supabase/server";
import type { Projeto, ProjetoEtapa } from "@/types/database";

export async function listarProjetos(): Promise<Projeto[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("projetos")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as Projeto[] | null) ?? [];
}

export async function obterProjeto(id: string): Promise<Projeto | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("projetos")
    .select("*")
    .eq("id", id)
    .single();
  return (data as Projeto | null) ?? null;
}

export async function listarEtapas(
  projetoId: string
): Promise<ProjetoEtapa[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("projeto_etapas")
    .select("*")
    .eq("projeto_id", projetoId)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });
  return (data as ProjetoEtapa[] | null) ?? [];
}
