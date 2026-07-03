import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

type CookieParaGravar = { name: string; value: string; options: CookieOptions };

/**
 * Client Supabase para Server Components, Server Actions e Route Handlers.
 * Lê e grava a sessão nos cookies da requisição.
 */
export async function criarClienteServidor() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL ?? "", SUPABASE_ANON_KEY ?? "", {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieParaGravar[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Chamado a partir de um Server Component — pode ser ignorado
          // quando há middleware cuidando da atualização da sessão.
        }
      },
    },
  });
}
