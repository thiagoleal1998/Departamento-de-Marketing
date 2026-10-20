import { criarClienteServidor } from "@/lib/supabase/server";
import type { EstoqueItem, EstoqueMovimento } from "@/types/database";

export async function listarItensEstoque(): Promise<EstoqueItem[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("estoque_itens")
    .select("*")
    .eq("ativo", true)
    .order("nome", { ascending: true });
  return (data as EstoqueItem[] | null) ?? [];
}

export async function listarMovimentosRecentes(
  limite = 40
): Promise<EstoqueMovimento[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("estoque_movimentos")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limite);
  return (data as EstoqueMovimento[] | null) ?? [];
}

export interface OpcaoVinculo {
  id: string;
  rotulo: string;
}

export async function listarOpcoesVinculo(): Promise<{
  chamados: OpcaoVinculo[];
  projetos: OpcaoVinculo[];
}> {
  const supabase = await criarClienteServidor();
  const [c, p] = await Promise.all([
    supabase
      .from("chamados")
      .select("id, numero, titulo")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("projetos")
      .select("id, nome")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  return {
    chamados: (c.data ?? []).map((x: { id: string; numero: number; titulo: string }) => ({
      id: x.id,
      rotulo: `#${x.numero} — ${x.titulo}`,
    })),
    projetos: (p.data ?? []).map((x: { id: string; nome: string }) => ({
      id: x.id,
      rotulo: x.nome,
    })),
  };
}

export interface AlteracaoEstoque {
  id: string;
  item_id: string | null;
  campo: "nome" | "estoque_minimo";
  valor_anterior: string | null;
  valor_novo: string | null;
  usuario_id: string | null;
  created_at: string;
}

/** Trocas de nome e de estoque mínimo (vazio se a migration 0052 ainda não foi aplicada). */
export async function listarAlteracoesRecentes(limite = 40): Promise<AlteracaoEstoque[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("estoque_alteracoes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limite);
  return (data as AlteracaoEstoque[] | null) ?? [];
}
