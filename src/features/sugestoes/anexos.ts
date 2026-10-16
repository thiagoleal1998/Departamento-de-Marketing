export const BUCKET_FEEDBACK = "feedback-midias";
export const MAX_ANEXOS = 5;
export const MAX_BYTES_ANEXO = 50 * 1024 * 1024;

export const TIPOS_ANEXO = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

/** Anexo guardado no envio (caminho dentro do bucket privado). */
export interface AnexoSugestao {
  caminho: string;
  nome: string;
  tipo: string;
  tamanho: number;
}

/** Anexo com link temporário, pronto para exibir. */
export interface AnexoVisivel {
  url: string;
  nome: string;
  tipo: string;
}
