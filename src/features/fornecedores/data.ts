import { criarClienteServidor } from "@/lib/supabase/server";
import type { FornecedorResumo } from "./fornecedores-painel";

/** Fornecedores ativos com o resumo de cotações e compras (só a liderança lê, pela RLS). */
export async function listarFornecedoresResumo(): Promise<{ itens: FornecedorResumo[]; indisponivel: boolean }> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("fornecedores")
    .select("id, nome, contato_nome, telefone, email, site, cnpj, observacoes")
    .eq("ativo", true)
    .order("nome", { ascending: true });
  if (error) return { itens: [], indisponivel: true };

  const { data: cot } = await supabase
    .from("estoque_cotacoes")
    .select("fornecedor_id, contratado, quantidade, valor_unitario, valor_total_pago");
  const resumo = new Map<string, { cotacoes: number; compras: number; totalGasto: number }>();
  for (const c of (cot ?? []) as {
    fornecedor_id: string;
    contratado: boolean;
    quantidade: number | null;
    valor_unitario: number | string;
    valor_total_pago: number | string | null;
  }[]) {
    const r = resumo.get(c.fornecedor_id) ?? { cotacoes: 0, compras: 0, totalGasto: 0 };
    r.cotacoes += 1;
    if (c.contratado) {
      r.compras += 1;
      r.totalGasto += c.valor_total_pago !== null ? Number(c.valor_total_pago) : c.quantidade ? c.quantidade * Number(c.valor_unitario) : 0;
    }
    resumo.set(c.fornecedor_id, r);
  }

  return {
    itens: ((data ?? []) as Omit<FornecedorResumo, "cotacoes" | "compras" | "totalGasto">[]).map((f) => ({
      ...f,
      ...(resumo.get(f.id) ?? { cotacoes: 0, compras: 0, totalGasto: 0 }),
    })),
    indisponivel: false,
  };
}
