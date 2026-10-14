import { criarClienteServidor } from "@/lib/supabase/server";
import type { CadastroChave } from "./cadastros";
import { CADASTROS } from "./cadastros";

export async function listarCadastro(chave: CadastroChave) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from(CADASTROS[chave].tabela)
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as ({ id: string } & Record<string, string | null>)[];
}

export async function listarPessoasOpcoes() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("profiles")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome", { ascending: true });
  return ((data ?? []) as { id: string; nome: string }[]).map((p) => ({
    id: p.id,
    nome: p.nome,
  }));
}

export async function listarLpsOpcoes() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("landing_pages")
    .select("id, nome")
    .order("nome", { ascending: true });
  return ((data ?? []) as { id: string; nome: string }[]).map((l) => ({
    id: l.id,
    nome: l.nome,
  }));
}
