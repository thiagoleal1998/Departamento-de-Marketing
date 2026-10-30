import { TIPOS_IMAGEM } from "./anexo-tipos";

/** Lê o arquivo real da área de transferência, sem capturar texto ou imagens remotas do HTML copiado. */
export function imagemDaColagem(dados: DataTransfer): File | null {
  for (const item of Array.from(dados.items)) {
    if (item.kind !== "file" || !TIPOS_IMAGEM.includes(item.type)) continue;
    const arquivo = item.getAsFile();
    if (arquivo) return arquivo;
  }
  // Alguns navegadores preenchem apenas a lista de arquivos.
  return Array.from(dados.files).find((arquivo) => TIPOS_IMAGEM.includes(arquivo.type)) ?? null;
}
