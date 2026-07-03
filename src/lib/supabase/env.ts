/**
 * Leitura centralizada das variáveis do Supabase.
 * Como a conexão é configurada manualmente, o app deve funcionar de forma
 * amigável quando ainda não há credenciais (mostra instruções em vez de quebrar).
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
/** Somente servidor — nunca exponha no client. */
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function supabaseConfigurado(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
