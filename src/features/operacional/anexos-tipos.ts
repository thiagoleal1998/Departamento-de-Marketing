export const BUCKET_ANEXOS = "tarefa-anexos";
export const MAX_BYTES_ANEXO = 20 * 1024 * 1024;

export const TIPOS_ANEXO = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
];

/** Para o seletor de arquivos do navegador. */
export const ACCEPT_ANEXO = ".png,.jpg,.jpeg,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip";

export interface AnexoView {
  id: string;
  nome: string;
  tipo: string | null;
  tamanho: number | null;
  url: string | null;
  ehImagem: boolean;
  criadoPorNome: string | null;
  criadoEm: string;
  podeExcluir: boolean;
}

export const tamanhoLegivel = (b: number | null) =>
  b === null ? "" : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
