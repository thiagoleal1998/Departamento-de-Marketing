"use client";

const ARQUIVO = "/sons/notificacao.mp3";
let audio: HTMLAudioElement | null = null;
let ultimo = 0;

/**
 * Toca o som de notificação do chat (ao enviar e ao receber mensagem). Vários trechos da tela escutam a mesma
 * mensagem; o intervalo mínimo evita tocar duas vezes. Se o navegador ainda não liberou o som (precisa de um
 * clique na página antes), o erro é ignorado.
 */
export function tocarSomChat() {
  if (typeof window === "undefined") return;
  const agora = Date.now();
  if (agora - ultimo < 1200) return;
  ultimo = agora;
  try {
    audio ??= Object.assign(new Audio(ARQUIVO), { volume: 0.7, preload: "auto" });
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  } catch {
    /* sem som */
  }
}
