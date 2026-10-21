"use server";

import { criarClienteServidor } from "@/lib/supabase/server";
import type { AcaoHistoricoLp, AlteracaoLp, EntradaHistoricoLp } from "./historico-lps";

type Linha = {
  id: string;
  landing_page_id: string | null;
  lp_nome: string;
  acao: AcaoHistoricoLp;
  alteracoes: AlteracaoLp[] | null;
  autor_id: string | null;
  created_at: string;
};

async function montar(linhas: Linha[]): Promise<EntradaHistoricoLp[]> {
  const supabase = await criarClienteServidor();
  const ids = Array.from(new Set(linhas.map((l) => l.autor_id).filter(Boolean))) as string[];
  const nomes = new Map<string, string>();
  if (ids.length) {
    const { data } = await supabase.from("profiles").select("id, nome").in("id", ids);
    for (const p of (data ?? []) as { id: string; nome: string }[]) nomes.set(p.id, p.nome);
  }
  return linhas.map((l) => ({
    id: l.id,
    landingPageId: l.landing_page_id,
    nome: l.lp_nome,
    acao: l.acao,
    alteracoes: l.alteracoes ?? [],
    autorNome: l.autor_id ? nomes.get(l.autor_id) ?? null : null,
    criadoEm: l.created_at,
  }));
}

/** Histórico de uma landing page (exibido ao clicar no lápis de edição). */
export async function historicoDaLp(lpId: string): Promise<{ itens: EntradaHistoricoLp[]; indisponivel?: boolean }> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("landing_pages_historico")
    .select("*")
    .eq("landing_page_id", lpId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return { itens: [], indisponivel: true };
  return { itens: await montar((data ?? []) as Linha[]) };
}

/** Movimentações de todas as landing pages (aba Histórico). */
export async function historicoGeralLps(limite = 500): Promise<{ itens: EntradaHistoricoLp[]; indisponivel?: boolean }> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("landing_pages_historico")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limite);
  if (error) return { itens: [], indisponivel: true };
  return { itens: await montar((data ?? []) as Linha[]) };
}
