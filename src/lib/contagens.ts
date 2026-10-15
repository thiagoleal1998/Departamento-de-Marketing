/**
 * Contagens de novidades por caminho (ex.: "/sugestoes" -> 3).
 * Usado para mostrar o número de novidades nos botões do menu.
 */
export type Contagens = Record<string, number>;

/** Soma as contagens do caminho (e filhos, a menos que `exato`). */
export function somarContagens(
  contagens: Contagens,
  href: string,
  exato = false
): number {
  let total = 0;
  for (const [caminho, qtd] of Object.entries(contagens)) {
    if (caminho === href || (!exato && caminho.startsWith(href + "/"))) {
      total += qtd;
    }
  }
  return total;
}
