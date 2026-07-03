import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * Client anônimo, sem sessão/cookies — para leituras públicas
 * (ex.: configuração de marca usada no login e no portal).
 */
export function criarClientePublico() {
  return createClient(SUPABASE_URL ?? "", SUPABASE_ANON_KEY ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
