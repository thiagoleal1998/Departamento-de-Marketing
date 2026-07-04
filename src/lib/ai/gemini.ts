import "server-only";
import { GoogleGenAI } from "@google/genai";

/**
 * Cliente do Google Gemini — SOMENTE servidor.
 * A chave nunca vai para o client. Como a configuração é manual, o app deve
 * degradar com elegância quando a chave ainda não foi preenchida: as funções
 * de IA retornam uma mensagem amigável em vez de quebrar.
 */
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/** Modelo padrão usado no assistente de feedback (tier gratuito). */
export const MODELO_IA = "gemini-2.5-flash";

export function iaDisponivel(): boolean {
  return Boolean(GEMINI_API_KEY);
}

let cliente: GoogleGenAI | null = null;

/** Retorna o cliente Gemini ou `null` se a chave não estiver configurada. */
export function obterClienteIA(): GoogleGenAI | null {
  if (!GEMINI_API_KEY) return null;
  if (!cliente) {
    cliente = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return cliente;
}
