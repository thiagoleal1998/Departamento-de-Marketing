import { criarClienteServidor } from "@/lib/supabase/server";
import { MEMBROS_PADRAO, type ItemAta, type MembroAta, type Reuniao } from "./tipos";

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

/** Equipe das atas (afastados e desligados); cai nos valores padrão se a tabela não existir. */
export async function carregarMembros(): Promise<MembroAta[]> {
  try {
    const supabase = await criarClienteServidor();
    const { data, error } = await supabase
      .from("ata_membros")
      .select("nome, situacao, desde, observacao");
    if (error || !data || data.length === 0) return MEMBROS_PADRAO;
    return data as MembroAta[];
  } catch {
    return MEMBROS_PADRAO;
  }
}

export async function carregarAtas() {
  const [reunioes, itens] = await Promise.all([
    todos<Reuniao>("reunioes", "data"),
    todos<ItemAta>("reuniao_itens", "created_at"),
  ]);
  return { reunioes, itens };
}
