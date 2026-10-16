import { criarClienteServidor } from "@/lib/supabase/server";
import type { CadastroChave } from "./cadastros";
import { CADASTROS } from "./cadastros";

export async function listarCadastro(chave: CadastroChave) {
  const supabase = await criarClienteServidor();
  // O banco devolve no máximo 1.000 linhas por consulta: busca em páginas.
  const TAMANHO = 1000;
  const linhas: ({ id: string } & Record<string, string | null>)[] = [];
  for (let inicio = 0; inicio < 50000; inicio += TAMANHO) {
    const { data, error } = await supabase
      .from(CADASTROS[chave].tabela)
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(inicio, inicio + TAMANHO - 1);
    if (error) break;
    const pagina = (data ?? []) as ({ id: string } & Record<string, string | null>)[];
    linhas.push(...pagina);
    if (pagina.length < TAMANHO) break;
  }

  // Landing pages e conteúdos do site: ordem alfabética (pt-BR, ignora acento/caixa).
  const campoOrdem =
    chave === "landing_pages" ? "nome" : chave === "conteudos_site" ? "titulo" : null;
  if (campoOrdem) {
    linhas.sort((a, b) =>
      String(a[campoOrdem] ?? "").localeCompare(String(b[campoOrdem] ?? ""), "pt-BR", {
        sensitivity: "base",
      })
    );
  }
  return linhas;
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
