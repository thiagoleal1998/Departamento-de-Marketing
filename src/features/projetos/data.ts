import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/server";
import type {
  Projeto,
  ProjetoEtapa,
  ProjetoDocumento,
  ProjetoComparativo,
} from "@/types/database";

export async function listarProjetos(categoria?: string): Promise<Projeto[]> {
  const supabase = await criarClienteServidor();
  let consulta = supabase.from("projetos").select("*");
  if (categoria) consulta = consulta.eq("categoria", categoria);
  const { data } = await consulta.order("created_at", { ascending: false });
  return ordenarPorData((data as Projeto[] | null) ?? []);
}

/**
 * Em ordem de data: primeiro o que ainda vai acontecer (ou está acontecendo), do mais próximo ao mais distante;
 * depois o que já passou, do mais recente ao mais antigo; por último os projetos sem data.
 */
function ordenarPorData(projetos: Projeto[]): Projeto[] {
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const inicio = (p: Projeto) => p.data_inicio ?? p.data_fim;
  const fim = (p: Projeto) => p.data_fim ?? p.data_inicio;
  const grupo = (p: Projeto) => (!inicio(p) ? 2 : (fim(p) as string) >= hoje ? 0 : 1);
  return projetos.slice().sort((a, b) => {
    const ga = grupo(a);
    const gb = grupo(b);
    if (ga !== gb) return ga - gb;
    if (ga === 0) return (inicio(a) as string).localeCompare(inicio(b) as string) || a.nome.localeCompare(b.nome, "pt-BR");
    if (ga === 1) return (fim(b) as string).localeCompare(fim(a) as string) || a.nome.localeCompare(b.nome, "pt-BR");
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
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

export async function listarDocumentos(
  projetoId: string
): Promise<ProjetoDocumento[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("projeto_documentos")
    .select("*")
    .eq("projeto_id", projetoId)
    .order("created_at", { ascending: false });
  return (data as ProjetoDocumento[] | null) ?? [];
}

export async function listarComparativos(
  projetoId: string
): Promise<ProjetoComparativo[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("projeto_comparativos")
    .select("*")
    .eq("projeto_id", projetoId)
    .order("item", { ascending: true })
    .order("valor", { ascending: true });
  return (data as ProjetoComparativo[] | null) ?? [];
}


export interface AtualizacaoProjeto {
  id: string;
  autor_id: string | null;
  texto: string;
  status_novo: string | null;
  origem: string;
  created_at: string;
}

/** Linha do tempo de atualizações (vazia se a migration 0050 ainda não foi aplicada). */
export async function listarAtualizacoes(projetoId: string): Promise<AtualizacaoProjeto[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("projeto_atualizacoes")
    .select("id, autor_id, texto, status_novo, origem, created_at")
    .eq("projeto_id", projetoId)
    .order("created_at", { ascending: false })
    .limit(200);
  return (data as AtualizacaoProjeto[] | null) ?? [];
}

/** Pessoas ativas para escolher como responsável (lê com a chave de serviço: o colaborador não enxerga os perfis dos colegas). */
export async function pessoasParaEscolher(): Promise<{ id: string; nome: string }[]> {
  if (!servicoDisponivel()) return [];
  const { data } = await criarClienteAdmin().from("profiles").select("id, nome").eq("ativo", true).order("nome", { ascending: true });
  return (data as { id: string; nome: string }[] | null) ?? [];
}
