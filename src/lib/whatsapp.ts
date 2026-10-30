/** Número com DDD/DDI, sem máscara; undefined indica entrada inválida. */
export function normalizarWhatsapp(valor: string): string | null | undefined {
  const texto = valor.trim();
  if (!texto) return null;
  if (!/^\+?[\d\s().-]+$/.test(texto)) return undefined;
  const numero = texto.replace(/\D/g, "");
  return /^\d{10,15}$/.test(numero) ? numero : undefined;
}
