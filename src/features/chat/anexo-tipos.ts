/** Imagem ou áudio enviado numa mensagem (gravado em chat_mensagens.anexo). */
export interface AnexoChat {
  tipo: "imagem" | "audio";
  url: string;
  nome: string;
  /** duração do áudio, em segundos */
  duracao?: number;
}

/** Textos automáticos das mensagens sem legenda (o balão já mostra a imagem/áudio, então o texto não se repete). */
export const TEXTOS_AUTOMATICOS = ["📷 Imagem", "🎤 Mensagem de voz", "🎵 Áudio"];

export const BUCKET_ANEXOS = "chat-anexos";
export const MAX_BYTES_ANEXO = 15 * 1024 * 1024;
export const TIPOS_IMAGEM = ["image/png", "image/jpeg", "image/webp", "image/gif"];
export const TIPOS_AUDIO = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-wav", "audio/aac", "audio/x-m4a", "audio/m4a"];
export const MAX_SEGUNDOS_GRAVACAO = 300;

export const duracaoTexto = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
