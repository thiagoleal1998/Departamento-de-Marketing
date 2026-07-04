import type { SupabaseClient } from "@supabase/supabase-js";

// Colunas adicionadas por migrations posteriores; se ainda não existirem no
// banco, removemos do payload e tentamos de novo (não quebra a criação).
const COLUNAS_OPCIONAIS = ["departamento", "segmento"];

/**
 * Insere um chamado tolerando colunas opcionais ausentes (caso as migrations
 * 0003/0004 ainda não tenham sido aplicadas). Retorna { data, error }.
 */
export async function inserirChamado(
  supabase: SupabaseClient,
  payload: Record<string, unknown>
) {
  const atual: Record<string, unknown> = { ...payload };

  // Tenta até remover cada coluna opcional citada em erro de schema.
  for (let tentativa = 0; tentativa <= COLUNAS_OPCIONAIS.length; tentativa++) {
    const res = await supabase
      .from("chamados")
      .insert(atual)
      .select("id, numero")
      .single();

    if (!res.error) return res;

    const msg = (res.error.message ?? "").toLowerCase();
    const remover = COLUNAS_OPCIONAIS.find(
      (c) => c in atual && msg.includes(c)
    );
    if (!remover) return res; // erro não relacionado a coluna opcional
    delete atual[remover];
  }

  return supabase.from("chamados").insert(atual).select("id, numero").single();
}
