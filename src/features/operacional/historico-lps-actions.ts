"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { AcaoHistoricoLp, AlteracaoLp, EntradaHistoricoLp } from "./historico-lps";

type Linha = {
  id: string;
  landing_page_id: string | null;
  lp_nome: string;
  acao: AcaoHistoricoLp;
  alteracoes: AlteracaoLp[] | null;
  nota?: string | null;
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
    nota: l.nota ?? null,
    autorNome: l.autor_id ? nomes.get(l.autor_id) ?? null : null,
    criadoEm: l.created_at,
  }));
}

/** Registra uma anotação livre no histórico da LP (ex.: mudança de budget). */
export async function adicionarNotaLp(lpId: string, texto: string): Promise<{ ok?: boolean; erro?: string }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  const nota = texto.trim().slice(0, 2000);
  if (!nota) return { erro: "Escreva a anotação." };
  const { data: lp } = await supabase.from("landing_pages").select("nome").eq("id", lpId).maybeSingle();
  if (!lp) return { erro: "Landing page não encontrada." };
  const { error } = await supabase.from("landing_pages_historico").insert({
    landing_page_id: lpId,
    lp_nome: (lp as { nome: string }).nome,
    acao: "anotacao",
    alteracoes: [],
    nota,
    autor_id: user.id,
  });
  if (error) return { erro: "Não foi possível salvar a anotação. A migration 0058 já foi aplicada?" };
  revalidatePath("/operacional/landing-pages");
  return { ok: true };
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
