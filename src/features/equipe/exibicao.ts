import "server-only";
import { criarClienteAdmin, servicoDisponivel } from "@/lib/supabase/admin";

/**
 * Nome de exibição de cada pessoa (id → "como quer ser chamada"), só de quem definiu um no perfil.
 * Serviço indisponível ou migration 0084 ainda não rodada: devolve vazio e quem chama usa o nome completo.
 */
export async function nomesDeExibicao(): Promise<Map<string, string>> {
  const mapa = new Map<string, string>();
  if (!servicoDisponivel()) return mapa;
  const { data, error } = await criarClienteAdmin().from("profiles").select("id, nome_exibicao").eq("ativo", true);
  if (error) return mapa;
  for (const p of (data as { id: string; nome_exibicao: string | null }[] | null) ?? []) {
    const n = p.nome_exibicao?.trim();
    if (n) mapa.set(p.id, n);
  }
  return mapa;
}
