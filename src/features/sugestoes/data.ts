import { criarClienteServidor } from "@/lib/supabase/server";
import type { Sugestao } from "@/types/database";

/** RLS já filtra: o usuário vê as próprias; a liderança vê todas. */
export async function listarSugestoes(): Promise<Sugestao[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("sugestoes")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as Sugestao[] | null) ?? [];
}
