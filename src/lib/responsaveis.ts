const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * A pessoa está entre os responsáveis do item? Os itens do calendário trazem nomes curtos ("Shay", "Gustavo"),
 * então vale o nome completo ou o primeiro nome (inclusive abreviado: "Shay" para Shayene).
 */
export function ehResponsavel(nomeCompleto: string, responsaveis: string[] | null | undefined): boolean {
  const primeiro = normalizar(nomeCompleto).split(" ")[0];
  if (!primeiro) return false;
  return (responsaveis ?? []).some((r) => {
    const n = normalizar(r);
    return n.length >= 3 && (n === normalizar(nomeCompleto) || primeiro.startsWith(n.split(" ")[0]) || n.split(" ")[0].startsWith(primeiro));
  });
}
