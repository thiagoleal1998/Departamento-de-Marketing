import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/env";
import type { Profile } from "@/types/database";

/**
 * Retorna o perfil do usuário autenticado (ou null).
 * Não redireciona — use em lugares que toleram ausência de sessão.
 */
export async function obterUsuarioAtual(): Promise<Profile | null> {
  if (!supabaseConfigurado()) return null;

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (profile as Profile) ?? null;
}

/**
 * Garante que há um usuário logado. Redireciona para /login caso contrário.
 * Use no topo de páginas/áreas autenticadas.
 */
export async function exigirUsuario(): Promise<Profile> {
  const perfil = await obterUsuarioAtual();
  if (!perfil) redirect("/login");
  return perfil;
}
