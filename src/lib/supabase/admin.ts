import { createClient } from "@supabase/supabase-js";
import {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from "./env";

/**
 * Client com service role — ignora RLS. Use APENAS no servidor e para
 * operações controladas (ex.: registrar um chamado vindo do portal público).
 * Nunca importe isto em Client Components.
 */
export function criarClienteAdmin() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ausente. Configure no .env.local para usar o portal público."
    );
  }
  return createClient(SUPABASE_URL ?? "", SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function servicoDisponivel(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}
