"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

/**
 * Grava uma célula do controle (LP × item × aba). Valor vazio remove o
 * registro. Mantém quem alterou e quando.
 */
export async function salvarCelulaControle(
  landingPageId: string,
  elemento: string,
  versao: string,
  valor: string
): Promise<{ ok?: boolean; erro?: string }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const texto = valor.trim().slice(0, 500);
  const { data: existente, error: erroBusca } = await supabase
    .from("lp_conteudos")
    .select("id")
    .eq("landing_page_id", landingPageId)
    .eq("elemento", elemento)
    .eq("versao", versao)
    .limit(1)
    .maybeSingle();
  if (erroBusca) return { erro: "Não foi possível salvar. Tente novamente." };

  if (!texto) {
    if (existente) {
      const { error } = await supabase
        .from("lp_conteudos")
        .delete()
        .eq("id", existente.id);
      if (error) return { erro: "Apenas a liderança pode limpar uma célula." };
    }
  } else if (existente) {
    const { error } = await supabase
      .from("lp_conteudos")
      .update({
        conteudo: texto,
        alterado_por: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existente.id);
    if (error) return { erro: "Não foi possível salvar. Tente novamente." };
  } else {
    const { error } = await supabase.from("lp_conteudos").insert({
      landing_page_id: landingPageId,
      elemento,
      versao,
      conteudo: texto,
      alterado_por: user.id,
    });
    if (error) return { erro: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/operacional/controle-lps");
  return { ok: true };
}
