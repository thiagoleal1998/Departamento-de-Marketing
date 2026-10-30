/** Reconhece colunas separadas por tabulação, sem adivinhar tabelas a partir de frases. */
export function tabelasDoTexto(texto: string): string {
  const linhas = texto.replace(/\r\n?/g, "\n").split("\n");
  const saida: string[] = [];
  for (let i = 0; i < linhas.length; i++) {
    const bloco: string[][] = [];
    while (i < linhas.length && linhas[i].includes("\t") && !linhas[i].startsWith("\t")) {
      bloco.push(linhas[i].split("\t"));
      i++;
    }
    if (bloco.length) {
      const colunas = bloco[0].length;
      if (bloco.length > 1 && bloco.every((r) => r.length === colunas)) {
        const linha = (r: string[]) => "| " + r.map((s) => s.trim().replace(/\|/g, "\\|")).join(" | ") + " |";
        saida.push("", linha(bloco[0]), linha(Array(colunas).fill("---")), ...bloco.slice(1).map(linha), "");
      } else saida.push(...bloco.map((r) => r.join("\t")));
      i--;
    } else saida.push(linhas[i]);
  }
  return saida.join("\n");
}
