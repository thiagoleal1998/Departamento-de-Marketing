import { criarClienteServidor } from "@/lib/supabase/server";
import { COLUNAS_OFERTA, type Oferta } from "./tipos";

type Bruto = Omit<Oferta, "conc_lv" | "conc_concorrente" | "conc_diferenca"> & {
  conc_lv: number | string | null;
  conc_concorrente: number | string | null;
  conc_diferenca: number | string | null;
};
const n = (v: number | string | null) => (v === null ? null : Number(v));
const normalizar = (b: Bruto): Oferta => ({ ...b, conc_lv: n(b.conc_lv), conc_concorrente: n(b.conc_concorrente), conc_diferenca: n(b.conc_diferenca) });

/** Ofertas de um intervalo de datas (inclusive), em ordem de data. */
export async function ofertasDoPeriodo(de: string, ate: string): Promise<{ itens: Oferta[]; indisponivel: boolean }> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("divulgacao_ofertas")
    .select(COLUNAS_OFERTA)
    .gte("data", de)
    .lte("data", ate)
    .order("data", { ascending: true })
    .order("tipo", { ascending: true })
    .order("linha_origem", { ascending: true })
    .limit(500);
  if (error) return { itens: [], indisponivel: true };
  return { itens: ((data ?? []) as Bruto[]).map(normalizar), indisponivel: false };
}

export const POR_PAGINA = 40;

export interface FiltroHistorico {
  q: string;
  tipo: string;
  de: string;
  ate: string;
  pagina: number;
}

/** Histórico paginado, com busca no produto/destino, tipo de divulgação, vantagem e observação. */
export async function historicoOfertas(f: FiltroHistorico): Promise<{ itens: Oferta[]; total: number; indisponivel: boolean }> {
  const supabase = await criarClienteServidor();
  let q = supabase.from("divulgacao_ofertas").select(COLUNAS_OFERTA, { count: "exact" });
  if (f.tipo === "nacional" || f.tipo === "internacional") q = q.eq("tipo", f.tipo);
  if (/^\d{4}-\d{2}-\d{2}$/.test(f.de)) q = q.gte("data", f.de);
  if (/^\d{4}-\d{2}-\d{2}$/.test(f.ate)) q = q.lte("data", f.ate);
  const termo = f.q.trim().replace(/[%,()]/g, " ");
  if (termo) {
    const t = `%${termo}%`;
    q = q.or(`produto.ilike.${t},canal.ilike.${t},vantagem.ilike.${t},observacao.ilike.${t},temporada.ilike.${t}`);
  }
  const inicio = Math.max(0, (f.pagina - 1) * POR_PAGINA);
  const { data, error, count } = await q
    .order("data", { ascending: false })
    .order("linha_origem", { ascending: true })
    .range(inicio, inicio + POR_PAGINA - 1);
  if (error) return { itens: [], total: 0, indisponivel: true };
  return { itens: ((data ?? []) as Bruto[]).map(normalizar), total: count ?? 0, indisponivel: false };
}
