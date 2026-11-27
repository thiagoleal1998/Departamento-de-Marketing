/** Tira as marcas de formatação para resumos de uma ou duas linhas (cards e busca). */
export function textoPlano(texto: string | null | undefined): string {
  return (texto ?? "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^(\s*)-\s+/gm, "$1• ")
    .replace(/\\([\\`*_{}[\]()#+\-.!<>|])/g, "$1");
}
