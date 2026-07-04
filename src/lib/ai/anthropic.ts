import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Cliente da Claude (Anthropic) — SOMENTE servidor.
 * A chave nunca vai para o client. Como a configuração é manual, o app deve
 * degradar com elegância quando a chave ainda não foi preenchida: as funções
 * de IA retornam uma mensagem amigável em vez de quebrar.
 */
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

/** Modelo padrão usado no assistente de feedback. */
export const MODELO_IA = "claude-opus-4-8";

export function iaDisponivel(): boolean {
  return Boolean(ANTHROPIC_API_KEY);
}

let cliente: Anthropic | null = null;

/** Retorna o cliente Anthropic ou `null` se a chave não estiver configurada. */
export function obterClienteIA(): Anthropic | null {
  if (!ANTHROPIC_API_KEY) return null;
  if (!cliente) {
    cliente = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  }
  return cliente;
}
