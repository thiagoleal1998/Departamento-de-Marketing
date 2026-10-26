/** Código do card: TAFMKT - 001/2026 (número sequencial do ano). Vazio enquanto a migration 0072 não rodou. */
export function codigoTarefa(numero: number | null | undefined, ano: number | null | undefined): string | null {
  if (!numero || !ano) return null;
  return `TAFMKT - ${String(numero).padStart(3, "0")}/${ano}`;
}

/** Data e hora de criação no horário de Brasília (igual no servidor e no navegador). */
export function criadaEm(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
