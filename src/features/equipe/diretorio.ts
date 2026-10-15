import { criarClienteServidor } from "@/lib/supabase/server";

export interface PessoaDiretorio {
  id: string;
  nome: string;
  cargo: string | null;
}

/**
 * Diretório da equipe (id, nome, cargo) visível para qualquer usuário.
 * Usa a função `diretorio_equipe()` (migration 0024), porque a RLS de
 * `profiles` só mostra o próprio perfil a colaboradores. Se a migration
 * ainda não foi aplicada, cai para a leitura direta (funciona para liderança).
 */
export async function obterDiretorio(): Promise<Map<string, PessoaDiretorio>> {
  const supabase = await criarClienteServidor();
  const mapa = new Map<string, PessoaDiretorio>();

  const { data, error } = await supabase.rpc("diretorio_equipe");
  if (!error && Array.isArray(data)) {
    for (const p of data as PessoaDiretorio[]) mapa.set(p.id, p);
    return mapa;
  }

  const { data: perfis } = await supabase
    .from("profiles")
    .select("id, nome, cargo")
    .eq("ativo", true)
    .order("nome", { ascending: true });
  for (const p of (perfis as PessoaDiretorio[] | null) ?? []) mapa.set(p.id, p);
  return mapa;
}
