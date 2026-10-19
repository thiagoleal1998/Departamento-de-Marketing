import { criarClienteServidor } from "@/lib/supabase/server";

export type StatusItem =
  | "nao_iniciado"
  | "em_andamento"
  | "concluido"
  | "cancelado";

export interface Reuniao {
  id: string;
  data: string;
  estado: "realizada" | "em_andamento";
  presencas: { nome: string; presenca: string; obs: string }[];
}

export interface ItemAta {
  id: string;
  reuniao_id: string;
  secao: "ata" | "pauta";
  ordem: number;
  titulo: string;
  serie: string;
  detalhamento: string | null;
  plano_acao: string | null;
  prioridade: number | null;
  responsavel_id: string | null;
  responsaveis_texto: string | null;
  link: string | null;
  prazo: string | null;
  status: StatusItem | null;
}

export const STATUS_ITEM_LABEL: Record<StatusItem | "sem", string> = {
  nao_iniciado: "Não iniciado",
  em_andamento: "Em andamento",
  concluido: "Finalizado",
  cancelado: "Cancelado",
  sem: "Sem status",
};

/** Item ainda aberto (cobrável). */
export const itemAberto = (s: StatusItem | null) =>
  s !== "concluido" && s !== "cancelado";

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
