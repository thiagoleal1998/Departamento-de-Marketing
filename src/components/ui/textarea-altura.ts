/** Mede novamente o conteúdo, respeitando rows/min-height e o box-sizing do campo. */
export function ajustarAlturaTextarea(campo: HTMLTextAreaElement): void {
  if (!campo.clientWidth) return; // Campos de etapas ocultas serão medidos ao ficar visíveis.
  campo.style.height = "auto";
  const estilo = getComputedStyle(campo);
  const numero = (valor: string) => parseFloat(valor) || 0;
  const extra = estilo.boxSizing === "border-box"
    ? numero(estilo.borderTopWidth) + numero(estilo.borderBottomWidth)
    : -numero(estilo.paddingTop) - numero(estilo.paddingBottom);
  campo.style.height = `${campo.scrollHeight + extra}px`;
}
