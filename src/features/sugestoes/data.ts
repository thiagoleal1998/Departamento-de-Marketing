import { criarClienteServidor } from "@/lib/supabase/server";
import type { Sugestao, SugestaoStatus } from "@/types/database";

export const ETAPAS_PADRAO: Record<SugestaoStatus, string> = {
  nova: "Nova",
  em_analise: "Em análise",
  planejada: "Planejada",
  concluida: "Concluída",
  descartada: "Descartada",
};

/** Nomes das etapas (personalizados pelo gerente; cai no padrão se faltar). */
export async function obterNomesEtapas(): Promise<
  Record<SugestaoStatus, string>
> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("sugestoes_etapas")
    .select("status, nome");
  const nomes = { ...ETAPAS_PADRAO };
  const linhas =
    (data as { status: SugestaoStatus; nome: string }[] | null) ?? [];
  for (const e of linhas) {
    if (e.status in nomes && e.nome.trim()) nomes[e.status] = e.nome;
  }
  return nomes;
}

/** RLS já filtra: o usuário vê as próprias; a liderança vê todas. */
export async function listarSugestoes(): Promise<Sugestao[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("sugestoes")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as Sugestao[] | null) ?? [];
}
