/** Lembretes: quantos dias antes da data o sistema avisa (0 = no dia). */
export const OPCOES_LEMBRETE: { dias: number; label: string }[] = [
  { dias: 0, label: "No dia" },
  { dias: 1, label: "1 dia antes" },
  { dias: 2, label: "2 dias antes" },
  { dias: 7, label: "1 semana antes" },
];

/** Aceita só os valores válidos, sem repetição, do mais distante para o mais próximo. */
export function normalizarLembretes(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  const validos = OPCOES_LEMBRETE.map((o) => o.dias);
  return Array.from(new Set(v.map(Number).filter((n) => validos.includes(n)))).sort((a, b) => b - a);
}

export function quandoLembrete(dias: number): string {
  return dias === 0 ? "hoje" : dias === 1 ? "amanhã" : dias === 7 ? "em 1 semana" : `em ${dias} dias`;
}
