import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeSP, somarDias } from "@/features/divulgacao/tipos";
import type { LinhaRelatorio } from "./agregar";

export interface FiltroRelatorio {
  de: string;
  ate: string;
  tipo: "" | "nacional" | "internacional";
  busca: string;
}

const ehData = (v: string | undefined) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Filtro vindo da URL; sem datas, o padrão são os últimos 30 dias. */
export function lerFiltro(sp: { de?: string; ate?: string; tipo?: string; q?: string }): FiltroRelatorio {
  const hoje = hojeSP();
  return {
    de: ehData(sp.de) ? sp.de! : somarDias(hoje, -29),
    ate: ehData(sp.ate) ? sp.ate! : hoje,
    tipo: sp.tipo === "nacional" || sp.tipo === "internacional" ? sp.tipo : "",
    busca: (sp.q ?? "").trim().slice(0, 80),
  };
}

/** Todas as divulgações do período (o banco devolve 1.000 por vez, então busca em páginas). */
export async function divulgacoesDoPeriodo(f: FiltroRelatorio): Promise<{ linhas: LinhaRelatorio[]; indisponivel: boolean }> {
  const supabase = await criarClienteServidor();
  const linhas: LinhaRelatorio[] = [];
  for (let i = 0; i < 10000; i += 1000) {
    let q = supabase
      .from("divulgacao_ofertas")
      .select("data, tipo, canal, produto, temporada")
      .gte("data", f.de)
      .lte("data", f.ate)
      .order("data", { ascending: true })
      .order("linha_origem", { ascending: true })
      .range(i, i + 999);
    if (f.tipo) q = q.eq("tipo", f.tipo);
    if (f.busca) {
      const t = `%${f.busca.replace(/[%,()]/g, " ")}%`;
      q = q.or(`produto.ilike.${t},canal.ilike.${t},temporada.ilike.${t}`);
    }
    const { data, error } = await q;
    if (error) return { linhas: [], indisponivel: true };
    const lote = (data ?? []) as LinhaRelatorio[];
    linhas.push(...lote);
    if (lote.length < 1000) break;
  }
  return { linhas, indisponivel: false };
}
