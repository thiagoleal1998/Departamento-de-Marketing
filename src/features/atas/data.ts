import { criarClienteServidor } from "@/lib/supabase/server";
import type { ItemAta, Reuniao } from "./tipos";

export * from "./tipos";

/** Busca em páginas (o banco devolve no máximo 1.000 linhas por consulta). */
async function todos<T>(tabela: string, ordem: string): Promise<T[]> {
  const supabase = await criarClienteServidor();
  const out: T[] = [];
  for (let ini = 0; ini < 20000; ini += 1000) {
    const { data, error } = await supabase
      .from(tabela)
      .select("*")
      .order(ordem, { ascending: true })
      .order("id", { ascending: true })
      .range(ini, ini + 999);
    if (error) break;
    const pagina = (data ?? []) as T[];
    out.push(...pagina);
    if (pagina.length < 1000) break;
  }
  return out;
}

export async function carregarAtas() {
  const [reunioes, itens] = await Promise.all([
    todos<Reuniao>("reunioes", "data"),
    todos<ItemAta>("reuniao_itens", "created_at"),
  ]);
  return { reunioes, itens };
}
